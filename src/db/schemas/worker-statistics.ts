import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import users from "./users";

const workerStatistics = pgTable("worker_statistics", {
  // worker_id is both PK and FK for a 1-to-1 relationship with users (Workers)
  workerId: uuid("worker_id")
    .primaryKey()
    .references(() => users.userId, { onDelete: "cascade" }),
  applicationsSubmitted: integer("applications_submitted").notNull().default(0),
  applicationsAccepted: integer("applications_accepted").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  lastCalculated: timestamp("last_calculated", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  // Maybe $onUpdate if stats are frequently recalculated by the system?
  // .$onUpdate(() => new Date()),
});

export const workerStatisticsRelations = relations(workerStatistics, ({ one }) => ({
  // Each stats record belongs to one worker (user)
  worker: one(users, {
    fields: [workerStatistics.workerId],
    references: [users.userId],
    relationName: "WorkerStats", // Matches relation name in users
  }),
}));

export default workerStatistics;