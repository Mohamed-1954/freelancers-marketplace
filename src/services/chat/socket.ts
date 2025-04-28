import type { Server, Socket } from 'socket.io';
import { verifyJwt } from '../auth/utils/jwt';
import config from '@/config/config';
import db from "@/db";
import { conversations, conversationParticipants, messages, users, jobs, applications } from "@/db/schemas/index";
import { and, eq, sql } from "drizzle-orm";
import { requestUserSchema, type RequestUserSchema } from '../auth/validations';
import { createMessageSchema } from './validations';
import { z } from 'zod';

// Define a schema for the findOrCreateConversation payload
const findOrCreateConversationSchema = z.object({
  recipientId: z.string().uuid(),
  jobId: z.string().uuid().optional().nullable(),
  applicationId: z.string().uuid().optional().nullable(),
});

// Extend Socket type to include the authenticated user
interface AuthenticatedSocket extends Socket {
  user: RequestUserSchema;
}

// Helper to find or create conversation (avoids duplicating logic)
async function findOrCreateConversation(senderId: string, recipientId: string, jobId?: string | null, applicationId?: string | null): Promise<string> {
  // Try finding existing conversation
  const existingConvo = await db.select({ id: conversations.conversationId })
    .from(conversations)
    .innerJoin(conversationParticipants, eq(conversations.conversationId, conversationParticipants.conversationId))
    .where(sql`conversations.conversation_id IN (
            SELECT cp1.conversation_id
            FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ${senderId} AND cp2.user_id = ${recipientId}
            -- Ensure only direct 2-person convos for now. Group chats need different logic.
            AND (SELECT COUNT(*) FROM conversation_participants cp3 WHERE cp3.conversation_id = cp1.conversation_id) = 2
        )`)
    // Optionally match context exactly if required for *finding* existing convo
    // .andWhere(jobId ? eq(conversations.jobId, jobId) : sql`1=1`)
    // .andWhere(applicationId ? eq(conversations.applicationId, applicationId) : sql`1=1`)
    .limit(1);

  if (existingConvo.length > 0) {
    return existingConvo[0].id;
  }

  // --- Create New Conversation ---
  let conversationId: string | null = null;
  let fetchedClientId: string | null = null;
  let fetchedWorkerId: string | null = null; // Variable for workerId

  // If jobId is provided, fetch the associated clientId
  if (jobId) {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.jobId, jobId),
      columns: { clientId: true }
    });
    if (!job?.clientId) {
      throw new Error(`Cannot create conversation: Job ${jobId} not found or missing client ID.`);
    }
    fetchedClientId = job.clientId;
  }

  // If applicationId is provided, fetch the associated workerId
  if (applicationId) {
    const application = await db.query.applications.findFirst({
      where: eq(applications.applicationId, applicationId),
      columns: { workerId: true }
    });
    if (!application?.workerId) {
      // Handle error: Application not found or missing workerId
      throw new Error(`Cannot create conversation: Application ${applicationId} not found or missing worker ID.`);
    }
    fetchedWorkerId = application.workerId;
  }

  // Create conversation within a transaction
  await db.transaction(async (tx) => {
    // Now include the fetchedClientId and fetchedWorkerId in the insert
    const [newConversation] = await tx.insert(conversations).values({
      jobId: jobId,
      applicationId: applicationId,
      clientId: fetchedClientId,
      workerId: fetchedWorkerId, // *** ADDED worker_id ***
    }).returning({ id: conversations.conversationId });

    if (!newConversation?.id) throw new Error("Failed to create conversation record.");
    conversationId = newConversation.id;

    await tx.insert(conversationParticipants).values([
      { conversationId: conversationId, userId: senderId },
      { conversationId: conversationId, userId: recipientId },
    ]);
  });

  if (!conversationId) throw new Error("Failed to establish conversation ID after transaction.");
  return conversationId;
}

export function initializeSocketIO(io: Server) {
  // Socket.IO Authentication Middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) return next(new Error('Authentication error: No token'));

    try {
      const decoded = await verifyJwt({ token, secret: config.jwt.accessTokenSecret });
      if (!decoded) return next(new Error('Authentication error: Invalid token'));

      const validation = requestUserSchema.safeParse(decoded); // Validate payload structure
      if (!validation.success) return next(new Error('Authentication error: Invalid token payload'));

      (socket as AuthenticatedSocket).user = validation.data; // Attach validated user
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err);
      next(new Error('Authentication error'));
    }
  });


  io.on('connection', (socket: Socket) => { // Use the base Socket type here
    const authenticatedSocket = socket as AuthenticatedSocket; // Cast to AuthenticatedSocket

    console.log(`User connected: ${authenticatedSocket.user.username} (Socket ID: ${authenticatedSocket.id})`);
    authenticatedSocket.join(authenticatedSocket.user.userId); // User's personal room for direct notifications

    // --- Join/Leave Conversation Room ---
    authenticatedSocket.on('joinRoom', async (conversationId: string) => {
      try {
        // Validate user is a participant before joining
        const participant = await db.query.conversationParticipants.findFirst({
          where: and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, authenticatedSocket.user.userId)),
          columns: { userId: true }
        });
        if (participant) {
          console.log(`${authenticatedSocket.user.username} joining room: ${conversationId}`);
          authenticatedSocket.join(conversationId);
        } else {
          console.warn(`User ${authenticatedSocket.user.username} attempted to join unauthorized room: ${conversationId}`);
          // Optionally emit an error back to the client
          authenticatedSocket.emit('error', { message: 'Unauthorized to join this room.' });
        }
      } catch (error) {
        console.error(`Error checking participation for joinRoom ${conversationId}:`, error);
      }
    });

    authenticatedSocket.on('leaveRoom', (conversationId: string) => {
      console.log(`${authenticatedSocket.user.username} leaving room: ${conversationId}`);
      authenticatedSocket.leave(conversationId);
    });

    // --- Find or Create Conversation ---
    authenticatedSocket.on('findOrCreateConversation', async (payload: unknown, callback: unknown) => {
      if (typeof callback !== 'function') {
        console.error("findOrCreateConversation: Invalid callback provided.");
        return; // No ack possible
      }

      const validation = findOrCreateConversationSchema.safeParse(payload);
      if (!validation.success) {
        console.error("Invalid findOrCreateConversation payload:", validation.error);
        callback({ status: "error", message: "Invalid payload", errors: validation.error.flatten().fieldErrors });
        return;
      }

      const { recipientId, jobId, applicationId } = validation.data;
      const senderId = authenticatedSocket.user.userId;

      if (senderId === recipientId) {
        callback({ status: "error", message: "Cannot create conversation with yourself" });
        return;
      }

      try {
        // Ensure recipient exists
        const recipientExists = await db.query.users.findFirst({ where: eq(users.userId, recipientId), columns: { userId: true } });
        if (!recipientExists) {
          callback({ status: "error", message: "Recipient not found" });
          return;
        }

        // Use the helper function
        const conversationId = await findOrCreateConversation(senderId, recipientId, jobId, applicationId);

        console.log(`[Socket] Conversation ${conversationId} ready for users ${senderId} and ${recipientId}`);
        // Acknowledge success to sender
        callback({ status: "ok", conversationId: conversationId });

      } catch (error: unknown) {
        console.error('Error handling findOrCreateConversation:', error);
        const errorMessage = error instanceof Error ? error.message : "Server error processing request";
        callback({ status: "error", message: errorMessage });
        // Optionally emit a generic error event to the sender's socket
        authenticatedSocket.emit('error', { message: 'Failed to find or create conversation.' });
      }
    });

    // --- Send Message ---
    authenticatedSocket.on('sendMessage', async (payload: unknown, callback: unknown) => { // Use unknown, validate with Zod
      const validation = createMessageSchema.safeParse(payload);
      if (!validation.success) {
        console.error("Invalid sendMessage payload:", validation.error);
        if (typeof callback === 'function') callback({ status: "error", message: "Invalid payload", errors: validation.error.flatten().fieldErrors });
        return;
      }

      const { recipientId, content, jobId, applicationId } = validation.data;
      const senderId = authenticatedSocket.user.userId; // Use casted socket
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const tempId = (payload as any)?.tempId; // Keep client-side ID if provided

      if (senderId === recipientId) {
        if (typeof callback === 'function') callback({ status: "error", message: "Cannot send message to yourself", tempId });
        return;
      }

      try {
        // Ensure recipient exists
        const recipientExists = await db.query.users.findFirst({ where: eq(users.userId, recipientId), columns: { userId: true } });
        if (!recipientExists) {
          if (typeof callback === 'function') callback({ status: "error", message: "Recipient not found", tempId });
          return;
        }

        // Find or create the conversation
        const conversationId = await findOrCreateConversation(senderId, recipientId, jobId, applicationId);

        // Persist Message
        const [newMessage] = await db.insert(messages).values({
          conversationId: conversationId,
          senderId: senderId,
          content: content,
        }).returning();

        if (!newMessage) throw new Error("Failed to save message.");

        // Update last_message_at
        await db.update(conversations)
          .set({ lastMessageAt: newMessage.sentAt })
          .where(eq(conversations.conversationId, conversationId));

        // Prepare message data to broadcast (include sender info)
        const messageToSend = {
          ...newMessage,
          sender: { userId: authenticatedSocket.user.userId, username: authenticatedSocket.user.username, profilePictureUrl: (await db.query.users.findFirst({ where: eq(users.userId, senderId), columns: { profilePictureUrl: true } }))?.profilePictureUrl } // Use casted socket
        };

        // Broadcast to the conversation room (all participants including sender's other sessions)
        io.to(conversationId).emit('receiveMessage', messageToSend);

        // Also potentially emit to the recipient's personal room if they aren't in the convo room
        // io.to(recipientId).emit('newMessageNotification', { conversationId, senderUsername: authenticatedSocket.user.username });

        // Acknowledge success to sender
        if (typeof callback === 'function') callback({ status: "ok", message: messageToSend, tempId });

      } catch (error: unknown) {
        console.error('Error handling sendMessage:', error);
        const errorMessage = error instanceof Error ? error.message : "Server error processing message";
        if (typeof callback === 'function') callback({ status: "error", message: errorMessage, tempId });
        // Optionally emit a generic error event to the sender's socket
        authenticatedSocket.emit('error', { message: 'Failed to send message.' }); // Use casted socket
      }
    });

    // --- Handle Disconnect ---
    authenticatedSocket.on('disconnect', (reason: unknown) => {
      console.log(`User disconnected: ${authenticatedSocket.user?.username ?? 'Unknown'} (Socket ID: ${authenticatedSocket.id}). Reason: ${reason}`); // Use casted socket
      // Perform cleanup if needed
    });

    // --- Generic Error Handling for Socket ---
    authenticatedSocket.on('error', (err: unknown) => {
      console.error(`Socket Error for user ${authenticatedSocket.user?.username}:`, (err as Error).message); // Use casted socket
      // Avoid crashing the server on socket errors
    });
  });
}
