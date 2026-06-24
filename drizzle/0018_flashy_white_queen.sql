CREATE TYPE "public"."deduction_category" AS ENUM('tax', 'insurance', 'loan', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_category_type" AS ENUM('travel', 'office_supplies', 'meals', 'utilities', 'software', 'transportation', 'accommodation', 'entertainment', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_claim_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'reimbursed');--> statement-breakpoint
CREATE TYPE "public"."payroll_period_status" AS ENUM('draft', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "deduction_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"category" "deduction_category" DEFAULT 'other' NOT NULL,
	"type" text DEFAULT 'fixed' NOT NULL,
	"default_value_cents" integer DEFAULT 0 NOT NULL,
	"default_rate" integer DEFAULT 0 NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deduction_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employee_bank_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"branch_name" text,
	"account_number" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"ifsc_code" text,
	"swift_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"deduction_id" uuid NOT NULL,
	"amount_cents" integer,
	"rate" integer,
	"is_percentage" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "expense_category_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_number" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"status" "expense_claim_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"admin_notes" text,
	"reimbursed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"category_id" uuid,
	"description" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"expense_date" date NOT NULL,
	"receipt_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_reimbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reimbursed_date" date NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"notes" text,
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_to_invoice_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_claim_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"payment_date" date,
	"status" "payroll_period_status" DEFAULT 'draft' NOT NULL,
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gross_pay_cents" integer DEFAULT 0 NOT NULL,
	"total_deductions_cents" integer DEFAULT 0 NOT NULL,
	"net_pay_cents" integer DEFAULT 0 NOT NULL,
	"earnings_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deductions_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attendance_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "payroll_run_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"pdf_url" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone,
	"emailed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"basic_salary_cents" integer DEFAULT 0 NOT NULL,
	"housing_allowance_cents" integer DEFAULT 0 NOT NULL,
	"transport_allowance_cents" integer DEFAULT 0 NOT NULL,
	"medical_allowance_cents" integer DEFAULT 0 NOT NULL,
	"other_allowances_cents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gross_salary_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_deduction_id_deduction_definitions_id_fk" FOREIGN KEY ("deduction_id") REFERENCES "public"."deduction_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_reimbursements" ADD CONSTRAINT "expense_reimbursements_claim_id_expense_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_reimbursements" ADD CONSTRAINT "expense_reimbursements_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_to_invoice_links" ADD CONSTRAINT "expense_to_invoice_links_expense_claim_id_expense_claims_id_fk" FOREIGN KEY ("expense_claim_id") REFERENCES "public"."expense_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_to_invoice_links" ADD CONSTRAINT "expense_to_invoice_links_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deduction_definitions_code_idx" ON "deduction_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "employee_bank_details_employee_idx" ON "employee_bank_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_deductions_employee_idx" ON "employee_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "expense_categories_type_idx" ON "expense_categories" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_claims_number_idx" ON "expense_claims" USING btree ("claim_number");--> statement-breakpoint
CREATE INDEX "expense_claims_employee_idx" ON "expense_claims" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "expense_claims_status_idx" ON "expense_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expense_claims_employee_status_created_idx" ON "expense_claims" USING btree ("employee_id","status","created_at");--> statement-breakpoint
CREATE INDEX "expense_items_claim_idx" ON "expense_items" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "expense_items_category_idx" ON "expense_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expense_reimbursements_claim_idx" ON "expense_reimbursements" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "expense_to_invoice_claim_idx" ON "expense_to_invoice_links" USING btree ("expense_claim_id");--> statement-breakpoint
CREATE INDEX "expense_to_invoice_invoice_idx" ON "expense_to_invoice_links" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_periods_name_idx" ON "payroll_periods" USING btree ("period_name");--> statement-breakpoint
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_runs_period_employee_idx" ON "payroll_runs" USING btree ("payroll_period_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_employee_idx" ON "payroll_runs" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payslips_run_idx" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payslips_employee_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "salary_structures_employee_idx" ON "salary_structures" USING btree ("employee_id");