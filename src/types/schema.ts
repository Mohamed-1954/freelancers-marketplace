import type {
  users,
  applications,
  conversationParticipants,
  conversations,
  jobs,
  messages,
  workerStatistics,
} from "@/db/schemas";
import type { InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type Application = InferSelectModel<typeof applications>;
export type ConversationParticipant = InferSelectModel<typeof conversationParticipants>;
export type Conversation = InferSelectModel<typeof conversations>;
export type Job = InferSelectModel<typeof jobs>;
export type Message = InferSelectModel<typeof messages>;
export type WorkerStatistic = InferSelectModel<typeof workerStatistics>;