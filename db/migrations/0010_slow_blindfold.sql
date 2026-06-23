CREATE TYPE "public"."email_job_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_job_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "messaging"."email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" varchar(320) NOT NULL,
	"template" varchar(100) NOT NULL,
	"vars" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "email_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(255),
	"recipient_id" uuid,
	"tenant_id" uuid,
	CONSTRAINT "email_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "messaging"."notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(100) NOT NULL,
	"vars" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resource_id" uuid,
	"status" "notification_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"dispatched_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(255),
	CONSTRAINT "notification_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notifications"."notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ix_email_outbox_status" ON "messaging"."email_outbox" USING btree ("status","scheduled_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "ix_notification_outbox_status" ON "messaging"."notification_outbox" USING btree ("status","scheduled_at") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notif_pref_user_type" ON "notifications"."notification_preferences" USING btree ("tenant_id","user_id","type");--> statement-breakpoint
CREATE INDEX "ix_wi_list" ON "work"."work_items" USING btree ("tenant_id","project_id","created_at") WHERE deleted_at IS NULL;