import { relations } from "drizzle-orm";
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import conversations from "./conversations";
import users from "./users";

const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .references(() => conversations.conversationId, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.userId, { onDelete: "cascade" })
      .notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastReadAt: timestamp("last_read_at", {
      withTimezone: true,
      mode: "date",
    }), // Track read status per user/convo
  },
  // Composite primary key definition
  (table) => {
    return {
      pk: primaryKey({ columns: [table.conversationId, table.userId] }),
    };
  }
);

// Relations for the join table
export const conversationParticipantRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.conversationId],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.userId],
    }),
  })
);

export default conversationParticipants;