CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'audio', 'file', 'system');--> statement-breakpoint
CREATE TYPE "public"."non_contact_policy" AS ENUM('everyone', 'request', 'nobody');--> statement-breakpoint
CREATE TYPE "public"."request_state" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."system_event_type" AS ENUM('group_created', 'member_added', 'member_removed', 'member_left', 'role_changed', 'group_renamed', 'group_image_changed');--> statement-breakpoint
CREATE TABLE "block" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "block_not_self" CHECK (blocker_id <> blocked_id)
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"owner_id" text NOT NULL,
	"contact_user_id" text NOT NULL,
	"alias" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_owner_id_contact_user_id_pk" PRIMARY KEY("owner_id","contact_user_id"),
	CONSTRAINT "contact_not_self" CHECK (owner_id <> contact_user_id)
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "conversation_type" NOT NULL,
	"name" text,
	"image_key" text,
	"dm_key" text,
	"created_by" text,
	"only_admins_can_edit_info" boolean DEFAULT true NOT NULL,
	"only_admins_can_add_members" boolean DEFAULT false NOT NULL,
	"last_seq" bigint DEFAULT 0 NOT NULL,
	"last_message_seq" bigint,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_dm_key_shape" CHECK ((type = 'direct') = (dm_key is not null)),
	CONSTRAINT "conversation_group_name" CHECK (type <> 'group' or name is not null)
);
--> statement-breakpoint
CREATE TABLE "conversation_member" (
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"history_visible_from_seq" bigint DEFAULT 0 NOT NULL,
	"invited_by" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"pinned_at" timestamp,
	"archived_at" timestamp,
	"muted_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_member_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_request" (
	"conversation_id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"state" "request_state" DEFAULT 'pending' NOT NULL,
	"allowed_through_seq" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"seq" bigint NOT NULL,
	"sender_id" text,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"reply_to_id" text,
	"system_event" "system_event_type",
	"metadata" jsonb,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_system_shape" CHECK ((type = 'system') = (system_event is not null))
);
--> statement-breakpoint
CREATE TABLE "message_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"file_name" text,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"thumbnail_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reaction" (
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_reaction_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"avatar_key" text,
	"non_contact_policy" "non_contact_policy" DEFAULT 'request' NOT NULL,
	"allow_group_invites_from_non_contacts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_contact_user_id_user_id_fk" FOREIGN KEY ("contact_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_request" ADD CONSTRAINT "conversation_request_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_request" ADD CONSTRAINT "conversation_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_request" ADD CONSTRAINT "conversation_request_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_reply_to_id_message_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachment" ADD CONSTRAINT "message_attachment_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reaction" ADD CONSTRAINT "message_reaction_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reaction" ADD CONSTRAINT "message_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_blockedId_idx" ON "block" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "contact_contactUserId_idx" ON "contact" USING btree ("contact_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_dmKey_idx" ON "conversation" USING btree ("dm_key");--> statement-breakpoint
CREATE INDEX "conversation_lastMessageAt_idx" ON "conversation" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "conversation_member_userId_idx" ON "conversation_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_member_invitedBy_idx" ON "conversation_member" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "conversation_member_active_idx" ON "conversation_member" USING btree ("user_id") WHERE left_at is null;--> statement-breakpoint
CREATE INDEX "conversation_request_recipientId_state_idx" ON "conversation_request" USING btree ("recipient_id","state");--> statement-breakpoint
CREATE INDEX "conversation_request_requesterId_idx" ON "conversation_request" USING btree ("requester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_conversationId_seq_idx" ON "message" USING btree ("conversation_id","seq");--> statement-breakpoint
CREATE INDEX "message_senderId_idx" ON "message" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "message_replyToId_idx" ON "message" USING btree ("reply_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_attachment_messageId_position_idx" ON "message_attachment" USING btree ("message_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "message_attachment_objectKey_idx" ON "message_attachment" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "message_reaction_userId_idx" ON "message_reaction" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");