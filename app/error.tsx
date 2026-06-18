"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="grid min-h-screen place-items-center bg-background p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/80"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
