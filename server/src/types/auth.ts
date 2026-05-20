export type AuthProvider = "credentials" | "google" | "demo";

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  avatarUrl: string | null;
  googleId: string | null;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface AuthenticatedRequestUser {
  sessionId: string;
  user: PublicAuthUser;
}
