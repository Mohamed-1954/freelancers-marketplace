import { relations } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
  text, // For cover letter
  index, // For indexing
} from "drizzle-orm/pg-core";
import { applicationStatusSimpleEnum } from "./enums";
import jobs from "./jobs";
import users from "./users";

const applications = pgTable(
  "applications",
  {
    applicationId: uuid("application_id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .references(() => jobs.jobId, { onDelete: "cascade" }) // Applications deleted if job deleted
      .notNull(),
    workerId: uuid("worker_id")
      .references(() => users.userId, { onDelete: "cascade" }) // Applications deleted if worker deleted
      .notNull(),
    coverLetter: text("cover_letter"), // Optional cover letter text
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
  // Table-level constraints and indexes
  (table) => {
    return {
      // Ensures a worker applies only once per job
      appJobWorkerUniqueIdx: uniqueIndex("app_job_worker_unique_idx").on(
        table.jobId,
        table.workerId
      ),
      // Index common lookup fields
      jobIdIdx: index("app_job_id_idx").on(table.jobId),
      workerIdIdx: index("app_worker_id_idx").on(table.workerId),
      statusIdx: index("app_status_idx").on(table.status),
    };
  }
);

export const applicationRelations = relations(applications, ({ one, many }) => ({
  // Each application belongs to one job
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.jobId],
  }),
  // Each application belongs to one worker (user)
  worker: one(users, {
    fields: [applications.workerId],
    references: [users.userId],
    relationName: "WorkerApplications", // Matches relation name in users schema
  }),
  // An application might lead to conversations (optional, depends on workflow)
  // If a conversation is directly linked to accepting an application, add relation here
  // conversations: many(conversations), // Or potentially a one-to-one if only one convo per app
}));

export default applications; // Export the table schema as default