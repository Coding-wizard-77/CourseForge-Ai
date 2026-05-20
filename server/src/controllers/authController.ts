import type { Request, Response } from "express";
import { z } from "zod";
import type { AppContext } from "../types/app.js";
import { AppError } from "../utils/errors.js";
import {
  AuthService,
  clearAuthCookies,
  clearOAuthStateCookie,
  createOAuthState,
  getOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie
} from "../services/authService.js";
import { env } from "../services/env.js";

const SignupSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const GoogleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

export function createAuthController(context: AppContext) {
  const authService = new AuthService(context.repository);

  return {
    signup: async (request: Request, response: Response) => {
      const input = SignupSchema.parse(request.body);
      const result = await authService.signup(input, request);
      setAuthCookies(response, result);
      response.status(201).json({ user: result.user });
    },

    login: async (request: Request, response: Response) => {
      const input = LoginSchema.parse(request.body);
      const result = await authService.login(input, request);
      setAuthCookies(response, result);
      response.json({ user: result.user });
    },

    me: async (request: Request, response: Response) => {
      if (!request.auth) {
        throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
      }
      const user = await authService.getUser(request.auth.user.id);
      response.json({ user });
    },

    refresh: async (request: Request, response: Response) => {
      const result = await authService.refresh(request);
      setAuthCookies(response, result);
      response.json({ user: result.user });
    },

    logout: async (request: Request, response: Response) => {
      await authService.logout(request);
      clearAuthCookies(response);
      response.status(204).send();
    },

    googleStart: async (_request: Request, response: Response) => {
      try {
        const state = createOAuthState();
        setOAuthStateCookie(response, state);
        response.redirect(authService.createGoogleAuthorizationUrl(state));
      } catch {
        clearOAuthStateCookie(response);
        response.redirect(`${env.CLIENT_ORIGIN}/?auth_error=google_config`);
      }
    },

    googleCallback: async (request: Request, response: Response) => {
      const callback = GoogleCallbackSchema.safeParse(request.query);
      const expectedState = getOAuthStateCookie(request);
      clearOAuthStateCookie(response);

      if (!callback.success || !expectedState || callback.data.state !== expectedState) {
        response.redirect(`${env.CLIENT_ORIGIN}/?auth_error=google_state`);
        return;
      }

      try {
        const result = await authService.loginWithGoogle(callback.data.code, request);
        setAuthCookies(response, result);
        response.redirect(`${env.CLIENT_ORIGIN}/?auth=google`);
      } catch {
        response.redirect(`${env.CLIENT_ORIGIN}/?auth_error=google`);
      }
    }
  };
}
