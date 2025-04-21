import type { Request } from "express";
import type { CreateMessageSchema, GetMessagesQuerySchema } from "./validations";

export interface CreateMessageHttpRequest extends Request {
  body: CreateMessageSchema;
}

export interface ListConversationsRequest extends Request {
  // Add query params if filtering/pagination is needed for conversation list
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface GetMessagesHttpRequest extends Request<{ conversationId: string }, any, any, GetMessagesQuerySchema> {
  // The query property is now correctly typed via the generic
  // The params property is now correctly typed via the generic
}

export interface MarkAsReadRequest extends Request {
  params: { conversationId: string };
}