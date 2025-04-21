// src/middlewares/validation.ts
import type { Request, Response, NextFunction } from "express";
import { type AnyZodObject, ZodError } from "zod";

interface ValidationOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Middleware factory to validate request body, query, and params using Zod schemas.
 * Passes ZodErrors to the next error handler.
 */
export const validateRequest = (schemas: ValidationOptions) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next(); 
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); 
        return;
      }
      next(error); 
    }
  };

/**
 * Specific error handler for Zod validation errors.
 * Place this BEFORE the generic centralizedErrorHandler in index.ts.
 */
export const validationErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    console.warn("Validation Error:", err.errors);
    res.status(400).json({
      message: "Validation Failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }
  next(err);
};