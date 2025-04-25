import type { Request } from "express";
// Import RequestUserSchema if needed elsewhere, or rely on req.user typing
import type { SignInSchema, SignUpSchema, RequestUserSchema } from "./validations";

export interface SignUpRequest extends Request {
  body: SignUpSchema;
}

export interface SignInRequest extends Request {
  body: SignInSchema;
}

// Extend Express Request type globally (already done in middlewares.ts)
// If you need a specific type for requests *after* authentication:
export interface AuthenticatedRequest extends Request {
    user: RequestUserSchema; // Use the validated schema type
}