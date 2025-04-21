import type { Request } from "express";
import type { CreateJobSchema, SelectJobSchema, UpdateJobSchema } from "./validations";

export interface CreateJobRequest extends Request {
  body: CreateJobSchema;
}
export interface UpdateJobRequest extends Request {
  body: UpdateJobSchema;
}

export interface SelectJobsRequest extends Request {
  query: {
    status?: string; // Enum value for job status
    search?: string; // Keyword search
    clientId?: string; // UUID for filtering by client
    limit?: string; // Positive integer, max 50
    offset?: string; // Non-negative integer
  }
}
export interface GetJobRequest extends Request {
  params: { jobId: string };
}
export interface DeleteJobRequest extends Request {
  params: { jobId: string };
}