// src/middlewares/validation.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError, z, type AnyZodObject } from "zod";

interface ValidationOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

// Define a type for the validated data using Zod inference
type ValidatedData<T extends ValidationOptions> = {
  body: T['body'] extends AnyZodObject ? z.infer<T['body']> : undefined;
  query: T['query'] extends AnyZodObject ? z.infer<T['query']> : undefined;
  params: T['params'] extends AnyZodObject ? z.infer<T['params']> : undefined;
};

// Extend Express Request type to include the typed validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData?: ValidatedData<any>; // Use 'any' here for generic extension
    }
  }
}

/**
 * Middleware factory to validate request body, query, and params using Zod schemas.
 * Stores validated data in req.validatedData instead of modifying original properties.
 * Passes ZodErrors to the next error handler.
 */
export const validateRequest = <T extends ValidationOptions>(schemas: T) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Initialize validatedData if it doesn't exist
      req.validatedData = req.validatedData ?? {};

      if (schemas.body) {
        // Assign validated body to req.body (usually safe) and req.validatedData.body
        const validatedBody = await schemas.body.parseAsync(req.body);
        req.body = validatedBody; // Keep for compatibility if needed
        req.validatedData.body = validatedBody;
      }
      if (schemas.query) {
        // Assign validated query ONLY to req.validatedData.query
        const validatedQuery = await schemas.query.parseAsync(req.query);
        req.validatedData.query = validatedQuery;
      }
      if (schemas.params) {
        // Assign validated params ONLY to req.validatedData.params
        const validatedParams = await schemas.params.parseAsync(req.params);
        req.validatedData.params = validatedParams;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Pass Zod errors to specific handler
        return;
      }
      next(error); // Pass other errors
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