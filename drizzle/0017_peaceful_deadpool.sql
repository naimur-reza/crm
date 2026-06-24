CREATE TABLE "attendance_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"predicted_date" date NOT NULL,
	"predicted_status" text NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text NOT NULL,
	"risk_factors" text[],
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"message_count" integer NOT NULL,
	"topic_tags" text[],
	"action_items" text[],
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_sentiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interaction_id" uuid NOT NULL,
	"label" text NOT NULL,
	"score" integer NOT NULL,
	"key_phrases" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_match_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_record_id" uuid NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"score" integer NOT NULL,
	"label" text NOT NULL,
	"reasoning" text NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_sentiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"label" text NOT NULL,
	"score" integer NOT NULL,
	"key_phrases" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_predictions" ADD CONSTRAINT "attendance_predictions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_summaries" ADD CONSTRAINT "chat_summaries_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_sentiments" ADD CONSTRAINT "interaction_sentiments_interaction_id_client_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."client_interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_match_suggestions" ADD CONSTRAINT "invoice_match_suggestions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_match_suggestions" ADD CONSTRAINT "invoice_match_suggestions_payment_record_id_payment_records_id_fk" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_sentiments" ADD CONSTRAINT "lead_sentiments_activity_id_lead_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."lead_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_predictions_employee_idx" ON "attendance_predictions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "attendance_predictions_date_idx" ON "attendance_predictions" USING btree ("predicted_date");--> statement-breakpoint
CREATE INDEX "chat_summaries_group_idx" ON "chat_summaries" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "invoice_match_invoice_idx" ON "invoice_match_suggestions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_match_payment_idx" ON "invoice_match_suggestions" USING btree ("payment_record_id");