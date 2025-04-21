import type { Request, Response, NextFunction } from "express";
import config from "@/config/config"; // Assuming config file for environment check

/**
 * Centralized error handling middleware. Catches all errors passed via next(error).
 * Place this LAST in the middleware chain in index.ts.
 */
export const centralizedErrorHandler = (
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Unhandled Error:", err);

  // Determine status code: use error's status, or specific codes, or default to 500
  const statusCode = err.status || 500;

  // Customize response based on error type or code if needed
  res.status(statusCode).json({
    message: err.message || "Internal Server Error", // Use error message if available
    stack: config.env === 'development' ? err.stack : undefined,
  });
};