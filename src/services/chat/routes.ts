import { Router } from "express";
import {
  listConversations,
  getMessages,
  markAsRead,
} from "./handlers"; // HTTP handlers
import { ensureParticipant } from "./middlewares";
import { validateRequest } from "@/common/middlewares";
import { getMessagesQuerySchema, conversationIdParamSchema } from "./validations";

const router = Router();

// GET /chat - List user's conversations
router.get("/", listConversations);

// GET /chat/:conversationId/messages - Get historical messages
router.get(
  "/:conversationId/messages",
  validateRequest({ params: conversationIdParamSchema, query: getMessagesQuerySchema }),
  ensureParticipant,
  getMessages
);

// POST /chat/:conversationId/read - Mark conversation as read
router.post(
  "/:conversationId/read",
  validateRequest({ params: conversationIdParamSchema }),
  ensureParticipant,
  markAsRead
);

// Optional: Fallback HTTP POST to send message (if desired)
// router.post(
//     "/",
//     validateRequest({ body: createMessageSchema }), // Use the same Zod schema
//     handlers.sendMessageHttp
// );

export default router;