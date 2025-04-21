import { users } from "@/db/schemas";
import { createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

// Schema for updating user profile - make fields optional
export const updateUserSchema = createUpdateSchema(users)

// Schema for query parameters when searching workers
export const findWorkersQuerySchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  // Add skill search, etc. later
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  offset: z.coerce.number().int().nonnegative().default(0).optional(),
});

export type UpdateUserSchema = z.infer<typeof updateUserSchema>;