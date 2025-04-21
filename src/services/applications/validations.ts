import { 
  applications, 
  applicationStatusSimpleEnum 
} from "@/db/schemas";
import { z } from "zod";

// Schema for applying to a job
export const applyJobSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID format"),
});

// Schema for updating application status
export const updateApplicationStatusSchema = z.object({
  // Use the enum values directly from the schema definition
  status: z.enum(applications.status.enumValues),
});

// Schema for listing applications (query params)
export const listApplicationsQuerySchema = z.object({
  jobId: z.string().uuid().optional(), // Required for Clients viewing applications for a job
  status: z.enum(applicationStatusSimpleEnum.enumValues).optional(), // Filter by status
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
  offset: z.coerce.number().int().nonnegative().default(0).optional(),
});

// Schema for route parameters
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid("Invalid Application ID format")
});

export type ApplyJobSchema = z.infer<typeof applyJobSchema>;
export type UpdateApplicationStatusSchema = z.infer<typeof updateApplicationStatusSchema>;
export type ListApplicationsQuerySchema = z.infer<typeof listApplicationsQuerySchema>;