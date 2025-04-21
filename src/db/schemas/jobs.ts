import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { jobStatusSimpleEnum } from "./enums";
import users from "./users";
import applications from "./applications";
import conversations from "./conversations";

const jobs = pgTable("jobs", {
  jobId: uuid("job_id").primaryKey().defaultRandom(),
  // Foreign key to the user who posted the job (Client)
  clientId: uuid("client_id")
    .references(() => users.userId, { onDelete: "cascade" }) // Assuming jobs deleted if client deleted
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: jobStatusSimpleEnum("status").notNull().default("Open"),
  postedDate: timestamp("posted_date", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobRelations = relations(jobs, ({ one, many }) => ({
  // Each job belongs to one client (user)
  client: one(users, {
    fields: [jobs.clientId],
    references: [users.userId],
    relationName: "ClientJobs", // Matches relation name in users
  }),
  // A job can receive many applications
  applications: many(applications),
  // A job can be associated with many conversations
  conversations: many(conversations),
}));

export default jobs;