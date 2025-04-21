import { z } from "zod";

export const createMessageSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  content: z.string().min(1, "Message content cannot be empty").max(5000),
  jobId: z.string().uuid("Invalid Job ID format").optional().nullable(),
  applicationId: z.string().uuid("Invalid Application ID format").optional().nullable(),
});

// Schema for query parameters when fetching messages
export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(30).optional(),
  // Cursor for pagination (e.g., timestamp or message ID)
  cursor: z.string().optional(), // Could be ISO timestamp or UUID
});

// Schema for route parameters
export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid("Invalid Conversation ID format")
});

export type CreateMessageSchema = z.infer<typeof createMessageSchema>;
export type GetMessagesQuerySchema = z.infer<typeof getMessagesQuerySchema>;