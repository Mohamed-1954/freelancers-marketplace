import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ['Client', 'Worker']);

export const jobStatusSimpleEnum = pgEnum("job_status_simple", [
  'Open',
  'InProgress',
  'Completed',
  'Cancelled',
]);

export const applicationStatusSimpleEnum = pgEnum("application_status_simple", [
  'Submitted',
  'Accepted',
  'Rejected',
  'Negotiating',
]);