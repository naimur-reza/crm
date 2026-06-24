import "server-only";

import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate, formatTime12 } from "@/lib/time";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 40;
const contentWidth = pageWidth - margin * 2;

type AttendanceReportRow = {
  employeeName: string;
  employeeDesignation: string | null;
  departmentName: string | null;
  attendanceDate: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  status: string;
  source: string | null;
  notes: string | null;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    half_day: "Half day",
  };
  return map[status] ?? status;
}

export async function generateAttendanceReportPdf(
  records: AttendanceReportRow[],
  monthLabel: string,
) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const white = rgb(1, 1, 1);
  const headerBg = rgb(0.13, 0.53, 0.8);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const darkBlue = rgb(0.1, 0.22, 0.42);

  const companyName =
    process.env.COMPANY_INVOICE_NAME || "Company Tools Limited";

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  function addPage() {
    currentPage = doc.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - margin;
  }

  async function drawHeader() {
    cursorY = pageHeight - margin - 10;

    const logoPath = path.join(process.cwd(), "assets", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await doc.embedPng(logoBytes);
      currentPage.drawImage(logoImage, {
        x: margin,
        y: cursorY - 50,
        width: 40,
        height: 50,
      });
    }

    const titleSize = 24;
    const titleText = "Attendance Report";
    const titleWidth = bold.widthOfTextAtSize(titleText, titleSize);
    currentPage.drawText(titleText, {
      x: pageWidth - margin - titleWidth,
      y: cursorY - 10,
      size: titleSize,
      font: bold,
      color: darkBlue,
    });

    currentPage.drawText(companyName, {
      x: margin + 50,
      y: cursorY - 5,
      size: 10,
      font: bold,
      color: black,
    });

    currentPage.drawText(monthLabel, {
      x: margin + 50,
      y: cursorY - 20,
      size: 9,
      font: regular,
      color: gray,
    });

    cursorY -= 70;
    currentPage.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: pageWidth - margin, y: cursorY },
      thickness: 1,
      color: darkBlue,
    });
    cursorY -= 10;
  }

  await drawHeader();

  const colWidths = {
    employee: 120,
    department: 80,
    date: 70,
    checkIn: 65,
    checkOut: 65,
    status: 60,
  };

  const colStarts = {
    employee: margin,
    department: margin + colWidths.employee,
    date: margin + colWidths.employee + colWidths.department,
    checkIn: margin + colWidths.employee + colWidths.department + colWidths.date,
    checkOut: margin + colWidths.employee + colWidths.department + colWidths.date + colWidths.checkIn,
    status: margin + colWidths.employee + colWidths.department + colWidths.date + colWidths.checkIn + colWidths.checkOut,
  };

  function drawTableHeader() {
    const rowH = 22;
    currentPage.drawRectangle({
      x: margin,
      y: cursorY - rowH,
      width: contentWidth,
      height: rowH,
      color: headerBg,
    });

    const texts = [
      { label: "Employee", x: colStarts.employee },
      { label: "Department", x: colStarts.department },
      { label: "Date", x: colStarts.date },
      { label: "Check In", x: colStarts.checkIn },
      { label: "Check Out", x: colStarts.checkOut },
      { label: "Status", x: colStarts.status },
    ];

    const textY = cursorY - rowH + 6;
    texts.forEach(({ label, x }) => {
      currentPage.drawText(label, {
        x: x + 4,
        y: textY,
        size: 8,
        font: bold,
        color: white,
      });
    });

    cursorY -= rowH;
  }

  drawTableHeader();

  const rowH = 20;
  for (const record of records) {
    if (cursorY - rowH < margin + 30) {
      currentPage.drawText(
        `Page ${doc.getPageCount()}`,
        { x: margin, y: margin - 10, size: 8, font: regular, color: gray },
      );
      addPage();
      await drawHeader();
      drawTableHeader();
    }

    const cellY = cursorY - rowH;
    const textY = cellY + 5;

    currentPage.drawLine({
      start: { x: margin, y: cellY },
      end: { x: pageWidth - margin, y: cellY },
      thickness: 0.5,
      color: lightGray,
    });

    currentPage.drawText(record.employeeName, {
      x: colStarts.employee + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    currentPage.drawText(record.departmentName ?? "-", {
      x: colStarts.department + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    currentPage.drawText(formatDate(record.attendanceDate), {
      x: colStarts.date + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    currentPage.drawText(formatTime12(record.checkInAt), {
      x: colStarts.checkIn + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    currentPage.drawText(formatTime12(record.checkOutAt), {
      x: colStarts.checkOut + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    currentPage.drawText(statusLabel(record.status), {
      x: colStarts.status + 4,
      y: textY,
      size: 8,
      font: regular,
      color: black,
    });

    cursorY = cellY;
  }

  currentPage.drawText(
    `Page ${doc.getPageCount()}`,
    { x: margin, y: margin - 10, size: 8, font: regular, color: gray },
  );

  const bytes = await doc.save();
  const filename = `attendance-report-${monthLabel.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "")}.pdf`;

  return { bytes, filename };
}
