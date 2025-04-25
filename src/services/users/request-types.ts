import type { Request } from "express";
import type { UpdateUserSchema } from "./validations";

export interface UpdateProfileRequest extends Request {
  body: UpdateUserSchema;
}

export interface FindWorkersRequest extends Request {
  query: {
    city: string;
    country: string;
    limit: string;
    offset: string;
  };
}