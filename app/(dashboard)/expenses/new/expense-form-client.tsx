"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/page-header";
import { saveDraftExpenseClaim, submitExpenseClaim } from "@/app/actions/expenses";

type Category = {
  id: string;
  name: string;
  type: string;
};

type ItemRow = {
  key: string;
  categoryId: string;
  description: string;
  amount: string;
  date: string;
};

export function ExpenseFormClient({
  employeeId,
  categories,
}: {
  employeeId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<ItemRow[]>([{ key: "1", categoryId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] }]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  let nextKey = useRef(2);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: String(nextKey.current++), categoryId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItem(key: string, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  }

  async function handleSave() {
    setSaving(true);
    const fd = new FormData(formRef.current!);
    try {
      const result = await saveDraftExpenseClaim(fd);
      toast.success("Draft saved.");
      if (result?.id) router.push(`/expenses/${result.id}`);
      else router.push("/expenses");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const fd = new FormData(formRef.current!);
    try {
      const result = await submitExpenseClaim(fd);
      toast.success("Expense claim submitted.");
      if (result?.id) router.push(`/expenses/${result.id}`);
      else router.push("/expenses");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Expense Claim"
        description="Create a new expense claim for review."
      />

      <form ref={formRef} className="space-y-8">
        <input type="hidden" name="employeeId" value={employeeId} />

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Claim Details</h3>
          <div className="grid gap-x-6 gap-y-5">
            <Field label="Title" name="title" required placeholder="e.g. Client meeting travel expenses" />
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <textarea
                name="description"
                rows={3}
                className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                placeholder="Describe the purpose of these expenses..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Expense Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.key}
                className="relative rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="itemCategoryId" value={item.categoryId} />
                  <Select
                    label="Category"
                    name="itemCategoryId"
                    value={item.categoryId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      updateItem(item.key, "categoryId", e.target.value)
                    }
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  <input
                    type="hidden"
                    name="itemDescription"
                    value={item.description}
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.key, "description", e.target.value)}
                      required
                      className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                      placeholder="Item description"
                    />
                  </div>
                  <input
                    type="hidden"
                    name="itemAmount"
                    value={item.amount}
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateItem(item.key, "amount", e.target.value)}
                      required
                      className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                      placeholder="0.00"
                    />
                  </div>
                  <input
                    type="hidden"
                    name="itemDate"
                    value={item.date}
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(item.key, "date", e.target.value)}
                      required
                      className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Total: $
              {items
                .reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0)
                .toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" disabled={saving || submitting} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button type="button" disabled={saving || submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </form>
    </div>
  );
}
