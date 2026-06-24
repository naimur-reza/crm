import "server-only";

type BankExportRow = {
  employeeName: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  netPayCents: number;
};

export function generateBankCsv(rows: BankExportRow[]): string {
  const headers = [
    "Employee Name",
    "Bank Name",
    "Account Number",
    "Account Holder Name",
    "IFSC Code",
    "Amount",
    "Remarks",
  ];

  const csvRows = [headers.map(escapeCsv).join(",")];

  for (const row of rows) {
    const amount = (row.netPayCents / 100).toFixed(2);
    csvRows.push(
      [
        escapeCsv(row.employeeName),
        escapeCsv(row.bankName),
        escapeCsv(row.accountNumber),
        escapeCsv(row.accountHolderName),
        escapeCsv(row.ifscCode),
        amount,
        "",
      ].join(","),
    );
  }

  return csvRows.join("\r\n");
}

function escapeCsv(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
}
