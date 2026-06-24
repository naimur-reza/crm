import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getActiveExpenseCategories } from "@/lib/db/queries/expenses";
import { getMyEmployee } from "@/app/actions/expenses";
import { ExpenseFormClient } from "./expense-form-client";

export default async function NewExpensePage() {
  const user = await requireUser();
  if (!canAccess(user, "expenses")) redirect("/dashboard");

  const [categories, employee] = await Promise.all([
    getActiveExpenseCategories(),
    getMyEmployee(),
  ]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">
          Your user account is not linked to an employee profile. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <ExpenseFormClient
      employeeId={employee.id}
      categories={categories}
    />
  );
}
