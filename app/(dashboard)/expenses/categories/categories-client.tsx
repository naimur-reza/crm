"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createCategory,
  updateCategory,
  toggleCategory,
} from "@/app/actions/expenses";

type Category = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

const categoryTypeLabels: Record<string, string> = {
  travel: "Travel",
  office_supplies: "Office Supplies",
  meals: "Meals",
  utilities: "Utilities",
  software: "Software",
  transportation: "Transportation",
  accommodation: "Accommodation",
  entertainment: "Entertainment",
  other: "Other",
};

export function CategoriesClient({
  categories,
  isAdmin,
}: {
  categories: Category[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        fd.set("id", editing.id);
        await updateCategory(fd);
        toast.success("Category updated.");
      } else {
        await createCategory(fd);
        toast.success("Category created.");
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleToggle(cat: Category) {
    const fd = new FormData();
    fd.set("id", cat.id);
    try {
      await toggleCategory(fd);
      toast.success(cat.isActive ? "Category deactivated." : "Category activated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Categories"
        description="Manage expense categories for claims."
      />

      {isAdmin && (
        <div className="flex items-center justify-end">
          <Dialog open={open} onOpenChange={(v) => { if (!pending) { setOpen(v); setEditing(null); } }}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4" />
              New Category
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update the expense category." : "Add a new expense category."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-x-6 gap-y-5 px-1">
                  <Field label="Name" name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. Client Travel" />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={editing?.description ?? ""}
                      className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                      placeholder="Optional description..."
                    />
                  </div>
                  <Select label="Type" name="type" required defaultValue={editing?.type ?? "other"}>
                    {Object.entries(categoryTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editing ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                {isAdmin ? (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) => (
                <tr key={cat.id} className="transition hover:bg-accent/50">
                  <td className="px-4 py-4 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-4 capitalize text-muted-foreground">
                    {categoryTypeLabels[cat.type] ?? cat.type}
                  </td>
                  <td className="max-w-xs truncate px-4 py-4 text-muted-foreground">
                    {cat.description ?? "-"}
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={cat.isActive ? "green" : "slate"}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditing(cat);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleToggle(cat)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title={cat.isActive ? "Deactivate" : "Activate"}
                        >
                          {cat.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
