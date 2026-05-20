import type { NextFunction, Request, Response } from "express";
import type { AppRepository } from "../db/repository.js";
import { AuthService } from "../services/authService.js";
import { AppError } from "../utils/errors.js";

export function requireAuth(repository: AppRepository) {
  const authService = new AuthService(repository);

  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      request.auth = await authService.authenticateRequest(request);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function optionalAuth(repository: AppRepository) {
  const authService = new AuthService(repository);

  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      request.auth = await authService.authenticateRequest(request);
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== 401) {
        next(error);
        return;
      }
    }

    next();
  };
}
