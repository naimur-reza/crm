export function dollarsToCents(value: FormDataEntryValue | null) {
  const numeric = Number(String(value ?? "0").replace(/,/g, ""));
  if (Number.isNaN(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100);
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}
