import { relations } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  index,
  primaryKey, // For indexing
} from "drizzle-orm/pg-core";
import users from "./users";
import jobs from "./jobs"; // Link conversation to a job
import messages from "./messages";
// Optional: Link directly to application if needed
// import applications from "./applications";

const conversations = pgTable("conversations", {
  conversationId: uuid("conversation_id").primaryKey().defaultRandom(),
  // Link to the job the conversation is about
  jobId: uuid("job_id")
    .references(() => jobs.jobId, { onDelete: "set null" }) // Keep convo if job deleted? Or cascade?
    .notNull(), // Make it required if a convo MUST be about a job
  // Link to the client involved
  clientId: uuid("client_id")
    .references(() => users.userId, { onDelete: "cascade" }) // Convo deleted if client deleted
    .notNull(),
  // Link to the worker involved
  workerId: uuid("worker_id")
    .references(() => users.userId, { onDelete: "cascade" }) // Convo deleted if worker deleted
    .notNull(),
  // Optional: Link to the specific application that initiated the conversation
  // applicationId: uuid("application_id").references(() => applications.applicationId, { onDelete: 'set null' }),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }) // Tracks last message time effectively
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "date" }) // Fix: Use unique field name
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Index participants and job for lookups
    jobIdIdx: index("convo_job_id_idx").on(table.jobId),
    clientIdIdx: index("convo_client_id_idx").on(table.clientId),
    workerIdIdx: index("convo_worker_id_idx").on(table.workerId),
    // Optional: Index for finding conversations between two specific users
    // participantsIdx: index("convo_participants_idx").on(table.clientId, table.workerId),
  };
});

// Add conversation participants join table for many-to-many relationship
const conversationParticipants = pgTable("conversation_participants", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.conversationId, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: "date" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.conversationId] }),
    userIdx: index("conversation_participants_user_idx").on(table.userId),
    conversationIdx: index("conversation_participants_conversation_idx").on(table.conversationId),
  };
});

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  // Conversation belongs to one job
  job: one(jobs, {
    fields: [conversations.jobId],
    references: [jobs.jobId],
  }),
  // Conversation involves one client
  client: one(users, {
    fields: [conversations.clientId],
    references: [users.userId],
    relationName: "ClientConversations", // Match relation name in users
  }),
  // Conversation involves one worker
  worker: one(users, {
    fields: [conversations.workerId],
    references: [users.userId],
    relationName: "WorkerConversations", // Match relation name in users
  }),
  // Conversation has many messages
  messages: many(messages),
  // Add participants relation
  participants: many(conversationParticipants),
}));

// Add conversation participant relations
export const conversationParticipantRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.conversationId],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.userId],
  }),
}));

export { conversationParticipants };
export default conversations; // Export the table schema as default