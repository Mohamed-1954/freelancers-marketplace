import type { Response } from "express";
import type { ListConversationsRequest, GetMessagesHttpRequest, MarkAsReadRequest, CreateMessageHttpRequest } from "./request-types";
import db from "@/db";
import { conversations, conversationParticipants, messages } from "@/db/schemas/index";
import { and, eq, sql, desc, lt } from "drizzle-orm";
import { getMessagesQuerySchema } from "./validations";

// --- List User's Conversations ---
export const listConversations = async (req: ListConversationsRequest, res: Response) => {
  const userId = req.user.userId;

  const userConversations = await db.query.conversations.findMany({
    // Subquery to find conversations user is part of
    where: sql`${conversations.conversationId} IN (SELECT conversation_id FROM conversation_participants WHERE user_id = ${userId})`,
    orderBy: [desc(conversations.lastMessageAt)], // Order by most recent message
    with: {
      // Include participants' info, including self initially to get lastReadAt
      participants: {
        columns: { userId: true, conversationId: false, joinedAt: false, lastReadAt: true }, // Load userId and lastReadAt
        with: {
          user: { columns: { userId: true, username: true, profilePictureUrl: true } }
        }
      },
      // Include the very last message snippet
      messages: {
        limit: 1,
        orderBy: [desc(messages.sentAt)],
        columns: { content: true, sentAt: true, senderId: true },
        with: { sender: { columns: { username: true } } } // Optionally include sender username
      }
    }
  });

  // Post-process to add an 'isUnread' flag and filter participants
  const processedConversations = userConversations.map(convo => {
    // Explicitly type convo to help TypeScript understand the structure
    const typedConvo = convo as typeof convo & {
      messages: Array<{ content: string; sentAt: Date; senderId: string; sender?: { username: string } }>;
      participants: Array<{ userId: string; lastReadAt: Date | null; user: { userId: string; username: string; profilePictureUrl: string | null } }>;
    };

    const lastMsg = typedConvo.messages?.[0];
    const currentUserParticipant = typedConvo.participants.find(p => p.userId === userId);
    const lastRead = currentUserParticipant?.lastReadAt;

    // Determine unread status based on last message time vs last read time
    const isUnread = !!lastMsg && (!lastRead || new Date(lastMsg.sentAt) > new Date(lastRead));
    // Calculate unread count (more complex, requires counting messages after lastRead - skip for now if isUnread flag is sufficient)
    // For simplicity, we'll use the isUnread flag for now. A proper count needs another query or different logic.
    const unreadCount = isUnread ? 1 : 0; // Simplified unread count

    const otherParticipants = typedConvo.participants
      .filter(p => p.userId !== userId)
      // Map to the structure expected by the frontend Conversation model
      .map(p => p.user); // Directly map the user object

    // Destructure to remove original participants and messages array
    const { participants, messages: originalMessages, ...rest } = typedConvo;

    // Construct the final object with the desired structure
    return {
      ...rest,
      participants: otherParticipants, // Use the filtered/mapped participants
      // Add lastMessage object matching frontend expectation
      lastMessage: lastMsg ? { content: lastMsg.content, sentAt: lastMsg.sentAt } : null,
      unreadCount: unreadCount, // Use the simplified unread count
      // Optionally include job info if needed by frontend model
      // job: { jobId: rest.jobId, title: 'Job Title Placeholder' } // Fetch actual job title if needed
    };
  });

  res.status(200).json(processedConversations);
};

// --- Get Messages for a Conversation ---
export const getMessages = async (req: GetMessagesHttpRequest, res: Response) => {
  const conversationId = req.params.conversationId; // Validated

  const { data, error } = getMessagesQuerySchema.safeParse(req.query);
  if (error) {
    res.status(400).json({ message: "Invalid query parameters", errors: error.issues });
    return;
  }

  const { limit, cursor } = data; // Validated
  // User participation checked by ensureParticipant middleware

  const conditions = [eq(messages.conversationId, conversationId)];

  // Basic cursor pagination based on sentAt timestamp
  if (cursor) {
    try {
      // Assuming cursor is an ISO timestamp string
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(messages.sentAt, cursorDate));
      } else {
        console.warn("Invalid cursor date format received:", cursor);
      }
    } catch (e) {
      console.warn("Error parsing cursor date:", cursor, e);
    }
  }

  const messageList = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: [desc(messages.sentAt)], // Get newest first within the limit
    limit: limit,
    with: { sender: { columns: { userId: true, username: true, profilePictureUrl: true } } }
  });

  // Reverse the results so they are chronologically ordered oldest -> newest for the client
  messageList.reverse();

  // Determine the next cursor (timestamp of the oldest message fetched)
  const nextCursor = messageList.length > 0 ? messageList[0].sentAt.toISOString() : null;
  // Indicate if there are likely more messages (basic check)
  const hasMore = messageList.length === limit;

  res.status(200).json({
    messages: messageList,
    pagination: {
      nextCursor: hasMore ? nextCursor : null, // Send cursor only if more might exist
    }
  });
};

// --- Mark Conversation as Read ---
export const markAsRead = async (req: MarkAsReadRequest, res: Response) => {
  const conversationId = req.params.conversationId; // Validated
  const userId = req.user.userId;
  // User participation checked by ensureParticipant middleware

  const result = await db.update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId)
    ))
    .returning({ userId: conversationParticipants.userId }); // Check if update occurred

  if (result.length === 0) {
    // Should not happen if ensureParticipant middleware worked
    console.warn(`MarkAsRead: No participant found for user ${userId} in convo ${conversationId}`);
  }

  res.status(200).json({ message: "Conversation marked as read." });
};

// --- (Optional) HTTP Fallback for Sending Message ---
// Usually handled by WebSocket, but can be included.
export const sendMessageHttp = async (req: CreateMessageHttpRequest, res: Response) => {
  // This requires the complex Find/Create Conversation logic + DB insert + Update lastMessageAt
  // Duplicates logic from socket-handlers.ts - consider extracting to a shared service function.
  console.warn("HTTP sendMessage called - ideally use WebSocket.");
  // TODO: Implement the core send message logic here if needed as fallback
  res.status(501).json({ message: "Not fully implemented via HTTP, use WebSocket." });
};