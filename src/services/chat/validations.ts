import { z } from "zod";

// Schema for creating a new message via socket.io
export const createMessageSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID format"),
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message too long"),
  jobId: z.string().uuid("Invalid job ID format").optional().nullable(),
  applicationId: z.string().uuid("Invalid application ID format").optional().nullable(),
  // tempId is handled separately in socket implementation
});

// Schema for route parameters with conversationId
export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
});

// Schema for getting messages with pagination
export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  cursor: z.string().optional(), // ISO timestamp for cursor-based pagination
});

// Types based on the schemas
export type CreateMessageSchema = z.infer<typeof createMessageSchema>;
export type GetMessagesQuerySchema = z.infer<typeof getMessagesQuerySchema>;