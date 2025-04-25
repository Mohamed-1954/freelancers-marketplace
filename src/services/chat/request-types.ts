import type { Request } from "express";
import type { CreateMessageSchema, GetMessagesQuerySchema } from "./validations";

export interface CreateMessageHttpRequest extends Request {
  body: CreateMessageSchema;
}

export interface ListConversationsRequest extends Request {
  // Add query params if filtering/pagination is needed for conversation list
}

export interface GetMessagesHttpRequest extends Request {
  params: { 
    conversationId: string 
  };
  query: {
    cursor: string;
    limit: string; 
  } 
}

export interface MarkAsReadRequest extends Request {
  params: { conversationId: string };
}