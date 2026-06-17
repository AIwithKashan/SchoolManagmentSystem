import * as XLSX from "xlsx";

interface ExcelStudent {
  name: string;
  class: string;
  section: string;
  rollNumber: string;
  admissionNumber: string;
  gender: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  attendancePct: number;
}

interface ExcelAttendanceDay {
  studentName: string;
  days: Record<number, string>; // map of day (1-31) -> status (P, A, L, etc.)
  presentCount: number;
  totalDays: number;
}

interface ExcelFee {
  studentName: string;
  class: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
}

interface ExcelGrade {
  studentName: string;
  rollNumber: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

interface ExcelTeacher {
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string;
  joiningDate: string;
  salary: number;
}

// Helper to auto-save workbook
function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// Export Teachers Excel
export function exportTeachersExcel(teachers: ExcelTeacher[]) {
  const headers = [
    "Teacher Name",
    "Employee ID",
    "Email Address",
    "Phone Number",
    "Qualification",
    "Specialization",
    "Joining Date",
    "Salary",
  ];

  const data = teachers.map((t) => [
    t.name,
    t.employeeId,
    t.email,
    t.phone || "-",
    t.qualification,
    t.specialization || "-",
    t.joiningDate,
    t.salary !== undefined ? t.salary : 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Teachers");

  saveWorkbook(wb, "teachers-database.xlsx");
}

// 1. Export Students Excel
export function exportStudentsExcel(students: ExcelStudent[]) {
  const headers = [
    "Student Name",
    "Class",
    "Section",
    "Roll Number",
    "Admission Number",
    "Gender",
    "Date of Birth",
    "Parent Name",
    "Parent Phone",
    "Attendance Rate (%)",
  ];

  const data = students.map((s) => [
    s.name,
    s.class,
    s.section,
    s.rollNumber || "-",
    s.admissionNumber,
    s.gender,
    s.dateOfBirth,
    s.parentName || "-",
    s.parentPhone || "-",
    s.attendancePct !== undefined ? `${s.attendancePct}%` : "-",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  
  saveWorkbook(wb, "students-database.xlsx");
}

// 2. Export Attendance Excel
export function exportAttendanceExcel(
  records: ExcelAttendanceDay[],
  monthName: string,
  classDisplayName: string
) {
  // Column Headers: Student Name, 1, 2, ..., 31, Present Count, Percentage
  const maxDays = 31; // Simplification, or dynamically check month
  const dayHeaders = Array.from({ length: maxDays }, (_, i) => String(i + 1));
  const headers = ["Student Name", ...dayHeaders, "Present", "Rate %"];

  const data = records.map((r) => {
    const dayStatuses = dayHeaders.map((dayStr) => {
      const day = parseInt(dayStr);
      return r.days[day] || "-"; // P, A, L, or - for weekend/future
    });

    const rate = r.totalDays > 0 ? Math.round((r.presentCount / r.totalDays) * 100) : 100;
    return [
      r.studentName,
      ...dayStatuses,
      r.presentCount,
      `${rate}%`,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  saveWorkbook(wb, `attendance-${classDisplayName.replace(/\s+/g, "-")}-${monthName.toLowerCase()}.xlsx`);
}

// 3. Export Fees Excel
export function exportFeesExcel(fees: ExcelFee[], month: string, year: number) {
  const headers = [
    "Student Name",
    "Class",
    "Fee Type",
    "Expected Amount",
    "Paid Amount",
    "Status",
    "Due Date",
    "Paid Date",
  ];

  let totalExpected = 0;
  let totalPaid = 0;

  const data = fees.map((f) => {
    totalExpected += f.amount;
    totalPaid += f.paidAmount;

    return [
      f.studentName,
      f.class,
      f.feeType,
      f.amount,
      f.paidAmount,
      f.status.toUpperCase(),
      f.dueDate,
      f.paidDate || "-",
    ];
  });

  // Append Totals Row
  data.push([
    "TOTALS",
    "",
    "",
    totalExpected,
    totalPaid,
    "",
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fee Invoices");

  saveWorkbook(wb, `billing-${month.toLowerCase()}-${year}.xlsx`);
}

// 4. Export Grades Excel
export function exportGradesExcel(results: ExcelGrade[], examTitle: string) {
  const headers = ["Student Name", "Roll Number", "Obtained Marks", "Max Marks", "Percentage", "Grade"];

  let totalObtained = 0;
  let totalMax = 0;
  let totalPct = 0;

  const data = results.map((r) => {
    totalObtained += r.obtainedMarks;
    totalMax += r.totalMarks;
    totalPct += r.percentage;

    return [
      r.studentName,
      r.rollNumber || "-",
      r.obtainedMarks,
      r.totalMarks,
      `${r.percentage}%`,
      r.grade,
    ];
  });

  // Calculate averages row
  const totalCount = results.length;
  const averageMarks = totalCount > 0 ? (totalObtained / totalCount).toFixed(1) : "0";
  const averagePct = totalCount > 0 ? Math.round(totalPct / totalCount) : 0;

  data.push([
    "AVERAGE",
    "",
    Number(averageMarks),
    totalCount > 0 ? results[0].totalMarks : 100, // assume uniform max marks
    `${averagePct}%`,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grades Ledger");

  saveWorkbook(wb, `grades-${examTitle.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}
