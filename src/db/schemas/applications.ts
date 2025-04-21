import { relations } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { applicationStatusSimpleEnum } from "./enums";
import jobs from "./jobs";
import users from "./users";
import conversations from "./conversations";

const applications = pgTable(
  "applications",
  {
    applicationId: uuid("application_id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .references(() => jobs.jobId, { onDelete: "cascade" })
      .notNull(),
    workerId: uuid("worker_id")
      .references(() => users.userId, { onDelete: "cascade" })
      .notNull(),
    status: applicationStatusSimpleEnum("status")
      .notNull()
      .default("Submitted"),
    submissionDate: timestamp("submission_date", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Table-level constraints (like unique constraints on multiple columns)
  (table) => {
    return {
      // Ensures a worker applies only once per job
      appJobWorkerIdx: uniqueIndex("app_job_worker_idx").on(
        table.jobId,
        table.workerId
      ),
    };
  }
);

export const applicationRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.jobId],
  }),
  worker: one(users, {
    fields: [applications.workerId],
    references: [users.userId],
    relationName: "WorkerApplications", // Matches relation name in users
  }),
  // An application might lead to conversations
  conversations: many(conversations),
}));

export default applications;