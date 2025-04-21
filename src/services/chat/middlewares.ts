import type { Request, Response, NextFunction } from "express";
import db from "@/db";
import { conversationParticipants } from "@/db/schemas/index";
import { and, eq } from "drizzle-orm";

// Checks if the logged-in user is a participant of the conversation (for HTTP routes)
export const ensureParticipant = async (req: Request, res: Response, next: NextFunction) => {
  const conversationId = req.params.conversationId;
  const userId = req.user?.userId;

  if (!conversationId || !userId) {
    return next(Object.assign(new Error("Missing conversation ID or user context."), { status: 400 }));
  }

  try {
    const participant = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ),
      columns: { userId: true } // Just need to check existence
    });

    if (!participant) {
      return next(Object.assign(new Error("Forbidden: You are not a participant of this conversation."), { status: 403 }));
    }
    // Optional: Attach participant info?
    // (req as any).participantInfo = participant;
    next();
  } catch (error) {
    console.error("Error checking conversation participation:", error);
    next(error); // Pass DB or other errors
  }
};