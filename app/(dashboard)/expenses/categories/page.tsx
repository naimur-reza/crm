import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getExpenseCategories } from "@/lib/db/queries/expenses";
import { CategoriesClient } from "./categories-client";

export default async function ExpenseCategoriesPage() {
  const user = await requireUser();
  if (!canAccess(user, "expenses")) redirect("/dashboard");

  const isAdmin = canAccess(user, "expenses") && !user.roles.includes("employee");
  const categories = await getExpenseCategories();

  return (
    <CategoriesClient
      categories={categories as any[]}
      isAdmin={isAdmin}
    />
  );
}
