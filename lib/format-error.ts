export function formatError(caught: unknown): string {
  if (typeof caught === "object" && caught !== null) {
    const err = caught as Record<string, unknown>;
    if (Array.isArray(err.issues)) {
      return err.issues.map((issue: Record<string, unknown>) => issue.message).join(", ");
    }
    if (typeof err.message === "string") {
      try {
        const parsed = JSON.parse(err.message);
        if (Array.isArray(parsed)) {
          return parsed.map((issue: Record<string, unknown>) => issue.message).join(", ");
        }
      } catch {
        return err.message;
      }
      return err.message;
    }
  }
  return "Something went wrong.";
}
