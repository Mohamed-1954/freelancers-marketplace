// src/db/schema/messages.ts
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  index, // For indexing
} from "drizzle-orm/pg-core";
import conversations from "./conversations";
import users from "./users";

const messages = pgTable("messages", {
  messageId: uuid("message_id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.conversationId, { onDelete: "cascade" }) // Messages deleted if convo deleted
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => users.userId, { onDelete: "cascade" }) // Messages deleted if sender deleted
    .notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  isRead: boolean("is_read").default(false), // Track read status
  // No createdAt/updatedAt needed if sentAt covers it
}, (table) => {
    return {
        // Index conversation ID for fetching messages for a convo
        convoIdIdx: index("msg_convo_id_idx").on(table.conversationId),
        // Index sender ID if needed for specific queries
        senderIdIdx: index("msg_sender_id_idx").on(table.senderId),
    };
});

export const messageRelations = relations(messages, ({ one }) => ({
  // Each message belongs to one conversation
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.conversationId],
  }),
  // Each message has one sender (user)
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.userId],
    relationName: "SenderMessages", // Match relation name in users
  }),
}));

export default messages; // Export the table schema as default