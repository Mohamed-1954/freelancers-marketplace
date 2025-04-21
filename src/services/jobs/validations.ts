import { jobs, jobStatusSimpleEnum } from "@/db/schemas";
import { createInsertSchema, createUpdateSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Schema for creating a job (client_id will be added from req.user)
export const createJobSchema = createInsertSchema(jobs, {
  title: (schema) => schema.min(5, "Title must be at least 5 characters").max(255),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
}).omit({
  jobId: true,
  clientId: true,
  status: true,
  postedDate: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating a job (make fields optional)
export const updateJobSchema = createUpdateSchema(jobs); // Allow partial updates

// Schema for listing/searching jobs (query params)
export const selectJobSchema = z.object({
  status: z.enum(jobStatusSimpleEnum.enumValues).optional(),
  search: z.string().optional(), // Keyword search
  clientId: z.string().uuid().optional(), // Allow filtering by client
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
  offset: z.coerce.number().int().nonnegative().default(0).optional(),
  // Add orderBy, sortBy later if needed
});

export const jobIdParamSchema = z.object({ jobId: z.string().uuid("Invalid Job ID format") });

export type CreateJobSchema = z.infer<typeof createJobSchema>;
export type UpdateJobSchema = z.infer<typeof updateJobSchema>;
export type SelectJobSchema = z.infer<typeof selectJobSchema>;