import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "APP_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, "CONFIGURATION_ERROR", details);
  }
}

export function explainError(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  if (error instanceof ZodError) {
    return {
      message: "Invalid request payload",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name
    };
  }

  return {
    message: "Unknown error",
    code: "UNKNOWN_ERROR",
    details: error
  };
}
