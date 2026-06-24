ALTER TABLE "tasks" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
CREATE INDEX "tasks_sort_order_idx" ON "tasks" ("sort_order");
