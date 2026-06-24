CREATE TABLE "chat_typing_status" (
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_typing_status_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "chat_typing_status" ADD CONSTRAINT "chat_typing_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_typing_status" ADD CONSTRAINT "chat_typing_status_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_typing_status_group_id_idx" ON "chat_typing_status" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "chat_typing_status_updated_at_idx" ON "chat_typing_status" USING btree ("updated_at");