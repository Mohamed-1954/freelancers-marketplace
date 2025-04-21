import { users } from "@/db/schemas";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const signUpSchema = createInsertSchema(users, {
  // email
  email: (schema) =>
    schema.email({
      message: "Email is required",
    }),
  // username
  username: (schema) =>
    schema
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username cannot exceed 32 characters")
      .regex(/^[a-zA-Z0-9_.-]*$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  // userType
  userType: (schema) => schema,
  // password
  password: (schema) =>
    schema
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[@$!%*?&#]/,
        "Password must contain at least one special character (@$!%*?&#)"
      )
      .max(64, "Password cannot exceed 64 characters"),
});

// Schema for Sign In
export const signInSchema = signUpSchema.pick({
  email: true,
  password: true,
});

// Correctly define the shape of the user object attached to the request by ensureToken
export const requestUserSchema = z.object({
  userId: z.string().uuid(), // Match the payload
  email: z.string().email(),
  username: z.string(),
  userType: z.enum(users.userType.enumValues), // Use enum values from schema
}).required(); // Ensure the whole object is required

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type SignInSchema = z.infer<typeof signInSchema>;
export type RequestUserSchema = z.infer<typeof requestUserSchema>;