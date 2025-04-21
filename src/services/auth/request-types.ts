import type { Request } from "express";
import type { SignInSchema, SignUpSchema } from "./validations";

export interface SignUpRequest extends Request {
  body: SignUpSchema;
}

export interface SignInRequest extends Request {
  body: SignInSchema;
}