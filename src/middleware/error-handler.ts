import type { ErrorHandler } from "hono";
import { HttpError } from "../services/redirect.ts";
import { logger } from "../helpers/logger.ts";

export const errorHandler: ErrorHandler = (err, c) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    logger.error(
      `[error] investigate this error: ${err.name}/${err.message}`,
      err.stack,
    );
  }

  return c.json({ statusCode: status, message }, status as 400);
};
