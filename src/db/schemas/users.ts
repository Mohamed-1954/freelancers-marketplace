// src/db/schema/users.ts
import { relations } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";
import jobs from "./jobs";
import applications from "./applications";
import conversationParticipants from "./conversation-participants";
import messages from "./messages";
import workerStatistics from "./worker-statistics";

const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  refreshToken: text("refresh_token").array().notNull().default([]),
  username: varchar("username", { length: 100 }).unique().notNull(),
  profilePictureUrl: text("profile_picture_url"),
  userType: userRoleEnum("user_type").notNull(),
  registrationDate: timestamp("registration_date", {
    withTimezone: true,
    mode: "date", // Use Date objects
  })
    .notNull()
    .defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true, mode: "date" }),
  emailVerified: boolean("email_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  phoneNumber: varchar("phone_number", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  // location: specific PostGIS type if needed - requires drizzle-postgis extension
  bio: text("bio"), // Worker-specific field
  skillsSummary: text("skills_summary"), // Worker-specific field
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()), // Automatically update on modification via Drizzle
});

// Define relations for easier querying
export const userRelations = relations(users, ({ one, many }) => ({
  // If user is a Client, they can have many jobs
  jobsAsClient: many(jobs, { relationName: "ClientJobs" }),
  // If user is a Worker, they can have many applications
  applicationsAsWorker: many(applications, { relationName: "WorkerApplications" }),
  // A user participates in many conversations
  conversationParticipants: many(conversationParticipants),
  // A user can send many messages
  sentMessages: many(messages),
  // If user is a Worker, they have one statistics record
  workerStatistics: one(workerStatistics, {
    fields: [users.userId],
    references: [workerStatistics.workerId],
    relationName: "WorkerStats",
  }),
}));

export default users;