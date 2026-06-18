CREATE TYPE "public"."chat_group_type" AS ENUM('team','group','direct');

CREATE TABLE "chat_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "type" "chat_group_type" DEFAULT 'group' NOT NULL,
  "created_by" uuid,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "chat_group_members" (
  "group_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_group_id_user_id_pk" PRIMARY KEY ("group_id", "user_id");

ALTER TABLE "chat_group_members"
  ADD CONSTRAINT "chat_group_members_group_id_chat_groups_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_group_members"
  ADD CONSTRAINT "chat_group_members_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "chat_groups"
  ADD CONSTRAINT "chat_groups_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "chat_messages" ADD COLUMN "group_id" uuid;

CREATE INDEX "chat_messages_group_id_idx" ON "chat_messages" USING btree ("group_id", "created_at" DESC);
CREATE INDEX "chat_group_members_user_id_idx" ON "chat_group_members" USING btree ("user_id");
