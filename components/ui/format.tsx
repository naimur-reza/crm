export function Money({ cents }: { cents: number | null | undefined }) {
  const value = (cents ?? 0) / 100;
  return (
    <span className="font-mono text-sm">
      TK{" "}
      {new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value)}
    </span>
  );
}

export function DateText({ value }: { value: string | Date | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">No date</span>;
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return <span>{date.toLocaleDateString()}</span>;
}
