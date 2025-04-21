import type { Request } from "express";
import type { ApplyJobSchema, UpdateApplicationStatusSchema } from "./validations";

export interface ApplyJobRequest extends Request {
  body: ApplyJobSchema;
}

export interface UpdateApplicationStatusRequest extends Request {
  body: UpdateApplicationStatusSchema;
  params: { applicationId: string };
}

export interface ListApplicationsRequest extends Request {
  query: {
    jobId: string; 
    status: string; 
    limit: string; 
    offset: string; 
  };
}

export interface GetApplicationRequest extends Request {
  params: { applicationId: string };
}

export interface DeleteApplicationRequest extends Request {
  params: { applicationId: string };
}