CREATE TYPE "public"."application_status_simple" AS ENUM('Submitted', 'Accepted', 'Rejected', 'Negotiating');--> statement-breakpoint
CREATE TYPE "public"."job_status_simple" AS ENUM('Open', 'InProgress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Client', 'Worker');--> statement-breakpoint
CREATE TABLE "applications" (
	"application_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"cover_letter" text,
	"status" "application_status_simple" DEFAULT 'Submitted' NOT NULL,
	"submission_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_at" timestamp with time zone,
	CONSTRAINT "conversation_participants_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"conversation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"job_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "job_status_simple" DEFAULT 'Open' NOT NULL,
	"posted_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"message_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_read" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"refresh_token" text[] DEFAULT '{}' NOT NULL,
	"username" varchar(100) NOT NULL,
	"profile_picture_url" text,
	"user_type" "user_role" NOT NULL,
	"registration_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"phone_number" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"bio" text,
	"skills_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "worker_statistics" (
	"worker_id" uuid PRIMARY KEY NOT NULL,
	"applications_submitted" integer DEFAULT 0 NOT NULL,
	"applications_accepted" integer DEFAULT 0 NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"last_calculated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_worker_id_users_user_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_users_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_worker_id_users_user_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_users_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_statistics" ADD CONSTRAINT "worker_statistics_worker_id_users_user_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_job_worker_unique_idx" ON "applications" USING btree ("job_id","worker_id");--> statement-breakpoint
CREATE INDEX "app_job_id_idx" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "app_worker_id_idx" ON "applications" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "app_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "convo_job_id_idx" ON "conversations" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "convo_client_id_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "convo_worker_id_idx" ON "conversations" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "msg_convo_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "msg_sender_id_idx" ON "messages" USING btree ("sender_id");