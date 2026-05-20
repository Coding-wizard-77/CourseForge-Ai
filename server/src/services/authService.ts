import crypto from "node:crypto";
import type { Request, Response } from "express";
import type { CookieOptions } from "express";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import type { AppRepository } from "../db/repository.js";
import { env } from "../services/env.js";
import type { AuthSessionRecord, AuthUserRecord, PublicAuthUser } from "../types/auth.js";
import { AppError } from "../utils/errors.js";

const ACCESS_COOKIE = "courseforge_access";
const REFRESH_COOKIE = "courseforge_refresh";
const OAUTH_STATE_COOKIE = "courseforge_oauth_state";
const PASSWORD_ROUNDS = 12;

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: "access";
}

interface SessionMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const GoogleTokenSchema = z.object({
  access_token: z.string().min(1)
});

const GoogleProfileSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional()
});

export class AuthService {
  constructor(private readonly repository: AppRepository) {}

  async signup(input: { email: string; password: string; name?: string | null }, request: Request) {
    const email = normalizeEmail(input.email);
    const existing = await this.repository.findAuthUserByEmail(email);
    if (existing) {
      throw new AppError("An account already exists for this email.", 409, "AUTH_EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
    const user = await this.repository.createAuthUser({
      email,
      name: input.name?.trim() || null,
      passwordHash,
      authProvider: "credentials"
    });

    return this.createLoginResult(user, getSessionMeta(request));
  }

  async login(input: { email: string; password: string }, request: Request) {
    const user = await this.repository.findAuthUserByEmail(input.email);
    if (!user?.passwordHash) {
      throw new AppError("Invalid email or password.", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Invalid email or password.", 401, "AUTH_INVALID_CREDENTIALS");
    }

    return this.createLoginResult(user, getSessionMeta(request));
  }

  async authenticateRequest(request: Request) {
    const token = getAccessToken(request);
    if (!token) {
      throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
    }

    const payload = verifyAccessToken(token);
    const [user, session] = await Promise.all([
      this.repository.findAuthUserById(payload.sub),
      this.repository.findAuthSessionById(payload.sessionId)
    ]);

    if (!user || !isActiveSession(session)) {
      throw new AppError("Your session has expired. Please sign in again.", 401, "AUTH_SESSION_EXPIRED");
    }

    return {
      sessionId: session.id,
      user: toPublicUser(user)
    };
  }

  async refresh(request: Request) {
    const refreshToken = getCookie(request, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new AppError("Refresh token is missing.", 401, "AUTH_REFRESH_REQUIRED");
    }

    const session = await this.repository.findAuthSessionByRefreshHash(hashToken(refreshToken));
    if (!isActiveSession(session)) {
      throw new AppError("Refresh token is invalid or expired.", 401, "AUTH_REFRESH_INVALID");
    }

    const user = await this.repository.findAuthUserById(session.userId);
    if (!user) {
      throw new AppError("Session user no longer exists.", 401, "AUTH_SESSION_INVALID");
    }

    await this.repository.revokeAuthSession(session.id);
    return this.createLoginResult(user, getSessionMeta(request));
  }

  async logout(request: Request) {
    const refreshToken = getCookie(request, REFRESH_COOKIE);
    if (!refreshToken) {
      return;
    }

    const session = await this.repository.findAuthSessionByRefreshHash(hashToken(refreshToken));
    if (session) {
      await this.repository.revokeAuthSession(session.id);
    }
  }

  async getUser(id: string) {
    const user = await this.repository.findAuthUserById(id);
    if (!user) {
      throw new AppError("User not found.", 404, "AUTH_USER_NOT_FOUND");
    }

    return toPublicUser(user);
  }

  createGoogleAuthorizationUrl(state: string) {
    ensureGoogleConfigured();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID!);
    url.searchParams.set("redirect_uri", getGoogleRedirectUri());
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async loginWithGoogle(code: string, request: Request) {
    ensureGoogleConfigured();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      throw new AppError("Google sign-in could not exchange the authorization code.", 401, "GOOGLE_TOKEN_EXCHANGE_FAILED");
    }

    const tokenPayload = GoogleTokenSchema.parse(await tokenResponse.json());
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });

    if (!profileResponse.ok) {
      throw new AppError("Google sign-in could not load the user profile.", 401, "GOOGLE_PROFILE_FAILED");
    }

    const profile = GoogleProfileSchema.parse(await profileResponse.json());
    if (profile.email_verified === false) {
      throw new AppError("Google account email is not verified.", 401, "GOOGLE_EMAIL_UNVERIFIED");
    }

    const user = await this.repository.upsertOAuthUser({
      email: profile.email,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      googleId: profile.sub
    });

    return this.createLoginResult(user, getSessionMeta(request));
  }

  private async createLoginResult(user: AuthUserRecord, meta: SessionMeta) {
    const issued = await issueSession(this.repository, user, meta);
    return {
      user: toPublicUser(user),
      ...issued
    };
  }
}

export function createOAuthState() {
  return crypto.randomBytes(24).toString("base64url");
}

export function toPublicUser(user: AuthUserRecord): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    createdAt: user.createdAt
  };
}

export function setAuthCookies(response: Response, issued: IssuedSession) {
  response.cookie(ACCESS_COOKIE, issued.accessToken, {
    ...baseCookieOptions(),
    maxAge: env.JWT_ACCESS_TTL_SECONDS * 1000
  });
  response.cookie(REFRESH_COOKIE, issued.refreshToken, {
    ...baseCookieOptions(),
    maxAge: issued.refreshExpiresAt.getTime() - Date.now()
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(ACCESS_COOKIE, baseCookieOptions());
  response.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}

export function setOAuthStateCookie(response: Response, state: string) {
  response.cookie(OAUTH_STATE_COOKIE, state, {
    ...baseCookieOptions(),
    maxAge: 10 * 60 * 1000
  });
}

export function getOAuthStateCookie(request: Request) {
  return getCookie(request, OAUTH_STATE_COOKIE);
}

export function clearOAuthStateCookie(response: Response) {
  response.clearCookie(OAUTH_STATE_COOKIE, baseCookieOptions());
}

async function issueSession(repository: AppRepository, user: AuthUserRecord, meta: SessionMeta): Promise<IssuedSession> {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await repository.createAuthSession({
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt.toISOString(),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress
  });

  return {
    refreshToken,
    refreshExpiresAt,
    accessToken: jwt.sign(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.id,
        type: "access"
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL_SECONDS }
    )
  };
}

function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (!decoded || typeof decoded === "string" || decoded.type !== "access" || typeof decoded.sub !== "string") {
      throw new Error("Unexpected JWT payload");
    }
    return decoded as AccessTokenPayload;
  } catch {
    throw new AppError("Access token is invalid or expired.", 401, "AUTH_ACCESS_INVALID");
  }
}

function isActiveSession(session: AuthSessionRecord | null): session is AuthSessionRecord {
  return Boolean(session && !session.revokedAt && Date.parse(session.expiresAt) > Date.now());
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAccessToken(request: Request) {
  return getCookie(request, ACCESS_COOKIE) ?? getBearerToken(request);
}

function getCookie(request: Request, name: string) {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[name];
}

function getBearerToken(request: Request) {
  const header = request.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

function getSessionMeta(request: Request): SessionMeta {
  return {
    userAgent: request.header("user-agent") ?? null,
    ipAddress: request.ip ?? null
  };
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: env.COOKIE_DOMAIN
  };
}

function ensureGoogleConfigured() {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new AppError("Google OAuth is not configured.", 503, "GOOGLE_OAUTH_NOT_CONFIGURED");
  }
}

function getGoogleRedirectUri() {
  return env.GOOGLE_OAUTH_REDIRECT_URI ?? `http://localhost:${env.PORT}/api/auth/google/callback`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
