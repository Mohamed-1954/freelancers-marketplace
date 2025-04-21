// src/db/schema/messages.ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import conversations from "./conversations";
import users from "./users";

const messages = pgTable("messages", {
  messageId: uuid("message_id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.conversationId, { onDelete: "cascade" })
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => users.userId, { onDelete: "cascade" }) // Or maybe set null if user deleted? Cascade is fine for now.
    .notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  // Note: is_read status typically handled via conversationParticipants.lastReadAt
});

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.conversationId],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.userId],
  }),
}));

export default messages;