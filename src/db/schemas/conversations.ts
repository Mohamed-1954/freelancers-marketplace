import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import jobs from "./jobs";
import applications from "./applications";
import messages from "./messages";
import conversationParticipants from "./conversation-participants";

const conversations = pgTable("conversations", {
  conversationId: uuid("conversation_id").primaryKey().defaultRandom(),
  // Optional foreign keys for context
  jobId: uuid("job_id").references(() => jobs.jobId, {
    onDelete: "set null", // Keep conversation if job deleted
  }),
  applicationId: uuid("application_id").references(
    () => applications.applicationId,
    {
      onDelete: "set null", // Keep conversation if application deleted
    }
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  lastMessageAt: timestamp("last_message_at", {
    withTimezone: true,
    mode: "date",
  }), // Updated via application logic when a new message arrives
});

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  // Optional related job
  job: one(jobs, {
    fields: [conversations.jobId],
    references: [jobs.jobId],
  }),
  // Optional related application
  application: one(applications, {
    fields: [conversations.applicationId],
    references: [applications.applicationId],
  }),
  // A conversation has many messages
  messages: many(messages),
  // A conversation has many participants
  participants: many(conversationParticipants),
}));

export default conversations;