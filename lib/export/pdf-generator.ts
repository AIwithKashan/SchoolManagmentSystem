import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface StudentData {
  name: string;
  class: string;
  rollNumber: string;
  admissionNumber: string;
  attendancePct: string;
}

export interface TeacherData {
  name: string;
  employeeId: string;
  qualification: string;
  specialization: string;
  joiningDate: string;
  salary: number;
}

export interface AttendanceRecord {
  date: string;
  status: string;
  remarks?: string;
}

export interface AttendanceSummaryData {
  studentName: string;
  class: string;
  presentDays: number;
  absentDays: number;
  rate: number;
}

export interface FeeRecord {
  receiptNo: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
}

export interface FeeSummaryData {
  studentName: string;
  class: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
}

export interface SubjectGrade {
  subject: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  remarks?: string;
}

export interface ReportCardData {
  studentName: string;
  className: string;
  rollNumber: string;
  admissionNumber: string;
  term: string;
  academicYear: string;
  subjects: SubjectGrade[];
  gpa: number;
  averagePercentage: number;
  attendanceRate: number;
  aiComment?: string;
  classTeacherName?: string;
  principalName?: string;
}

export interface ExamResult {
  studentName: string;
  rollNumber: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

// 1. Export Students PDF
export function exportStudentsPDF(students: StudentData[], schoolInfo: { name: string; city: string }) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(schoolInfo.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${schoolInfo.city} Campus  •  Student Registry Listing`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("STUDENTS LIST", 14, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, 53);

  const tableData = students.map((s, idx) => [
    idx + 1,
    s.name,
    s.class,
    s.rollNumber || "-",
    s.admissionNumber,
    s.attendancePct ? `${s.attendancePct}%` : "-",
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["#", "Student Name", "Class", "Roll No", "Admission No", "Attendance %"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`Total Count: ${students.length} students`, 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 186, 287);
  }

  doc.save("students-list.pdf");
}

// 2. Export Teachers PDF
export function exportTeachersPDF(teachers: TeacherData[], schoolInfo: { name: string; city: string }) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(schoolInfo.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${schoolInfo.city} Campus  •  Instructor Registry Listing`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("INSTRUCTORS DATABASE", 14, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, 53);

  const tableData = teachers.map((t, idx) => [
    idx + 1,
    t.name,
    t.employeeId,
    t.qualification,
    t.specialization || "-",
    t.joiningDate,
    t.salary ? `Rs. ${t.salary.toLocaleString()}` : "-",
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["#", "Instructor Name", "Employee ID", "Qualification", "Specialization", "Joining Date", "Basic Salary"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`Total Count: ${teachers.length} instructors`, 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 186, 287);
  }

  doc.save("teachers-list.pdf");
}

// 3. Export Attendance PDF (Student View)
export function exportAttendancePDF(
  records: AttendanceRecord[],
  student: { name: string; admissionNumber: string; class: string },
  monthName: string
) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("STUDENT ATTENDANCE REPORT", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Month: ${monthName}  •  Class: ${student.class}`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Student Details:", 14, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Name: ${student.name}`, 14, 52);
  doc.text(`Admission Number: ${student.admissionNumber}`, 14, 57);

  const totalDays = records.length;
  const present = records.filter(r => r.status === "PRESENT").length;
  const late = records.filter(r => r.status === "LATE").length;
  const leave = records.filter(r => r.status === "LEAVE").length;
  const absent = records.filter(r => r.status === "ABSENT").length;
  const presentRate = totalDays > 0 ? Math.round(((present + late + leave) / totalDays) * 100) : 100;

  autoTable(doc, {
    startY: 63,
    head: [["Present", "Late", "Excused Leave", "Absent", "Attendance Rate"]],
    body: [[present, late, leave, absent, `${presentRate}%`]],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59] },
    styles: { halign: "center", fontSize: 9 },
  });

  const tableData = records.map((r, idx) => [
    idx + 1,
    r.date,
    r.status,
    r.remarks || "-",
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["#", "Date", "Status / Attendance Check", "Remarks"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });

  doc.save(`attendance-${student.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// 4. Export Attendance Summary PDF (Principal View)
export function exportAttendanceSummaryPDF(
  records: AttendanceSummaryData[],
  schoolInfo: { name: string; city: string }
) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(schoolInfo.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${schoolInfo.city} Campus  •   Roster Attendance Summary Sheet`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("STUDENTS ATTENDANCE SUMMARY LEDGER", 14, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, 53);

  const tableData = records.map((r, idx) => [
    idx + 1,
    r.studentName,
    r.class,
    r.presentDays,
    r.absentDays,
    `${r.rate}%`,
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["#", "Student Name", "Class / Section", "Days Present", "Days Absent", "Rate %"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 },
  });

  doc.save("attendance-summary.pdf");
}

// 5. Export Fee Receipt PDF
export function exportFeeReceiptPDF(
  feeRecord: FeeRecord,
  student: { name: string; rollNumber: string; class: string; admissionNumber: string },
  school: { name: string; address: string; phone: string }
) {
  const doc = new jsPDF();

  doc.setTextColor(243, 244, 246);
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  (doc as any).saveState();
  (doc as any).rotate(45, 100, 100);
  doc.text("OFFICIAL RECEIPT", 45, 100);
  (doc as any).restoreState();

  doc.setDrawColor(229, 231, 235);
  doc.rect(5, 5, 200, 287);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(school.name.toUpperCase(), 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(school.address, 14, 25);
  doc.text(`Phone: ${school.phone}`, 14, 29);

  doc.setFillColor(243, 244, 246);
  doc.rect(130, 12, 66, 20, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FEE BILL RECEIPT", 134, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Receipt No: ${feeRecord.receiptNo}`, 134, 23);
  doc.text(`Date Issued: ${new Date().toLocaleDateString("en-PK")}`, 134, 28);

  doc.setLineWidth(0.3);
  doc.line(14, 38, 196, 38);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("BILL TO (STUDENT):", 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`Student Name: ${student.name}`, 14, 51);
  doc.text(`Class & Section: ${student.class}`, 14, 56);
  doc.text(`Roll Number: #${student.rollNumber}`, 14, 61);
  doc.text(`Admission ID: ${student.admissionNumber}`, 14, 66);

  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD & DATE:", 110, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`Billing Description: Monthly ${feeRecord.feeType}`, 110, 51);
  doc.text(`Due Date Limit: ${feeRecord.dueDate}`, 110, 56);
  doc.text(`Payment Status: ${feeRecord.status.toUpperCase()}`, 110, 61);
  doc.text(`Paid Date: ${feeRecord.paidDate || "-"}`, 110, 66);

  doc.line(14, 72, 196, 72);

  autoTable(doc, {
    startY: 76,
    head: [["Billing Item & Particulars", "Total Amount Expected", "Paid Amount Received"]],
    body: [
      [`Monthly Tuition Fees (${feeRecord.feeType})`, `Rs. ${feeRecord.amount.toLocaleString()}`, `Rs. ${feeRecord.paidAmount.toLocaleString()}`],
      ["Late Fee Fine Charge", "Rs. 0", "Rs. 0"],
      ["Promotions & Discounts", "Rs. 0", "Rs. 0"],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8.5 },
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  doc.setFillColor(243, 244, 246);
  doc.rect(120, finalY + 5, 76, 25, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total Fee Dues: Rs. ${feeRecord.amount.toLocaleString()}`, 124, finalY + 12);
  doc.setTextColor(16, 185, 129);
  doc.text(`Amount Received: Rs. ${feeRecord.paidAmount.toLocaleString()}`, 124, finalY + 18);
  doc.setTextColor(15, 23, 42);
  doc.text(`Balance Remaining: Rs. ${(feeRecord.amount - feeRecord.paidAmount).toLocaleString()}`, 124, finalY + 24);

  doc.setDrawColor(156, 163, 175);
  doc.rect(14, finalY + 5, 55, 25);
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("CASHIER VERIFICATION STAMP", 17, finalY + 10);
  
  if (feeRecord.status.toUpperCase() === "PAID") {
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PAID & VERIFIED", 18, finalY + 20);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("UNPAID / OUTSTANDING", 15, finalY + 20);
  }

  doc.setTextColor(156, 163, 175);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Terms: This is a system-generated official fee transaction invoice. School billing policies apply.", 14, 280);

  doc.save(`receipt-${feeRecord.receiptNo}.pdf`);
}

// 6. Export Fees Summary PDF
export function exportFeesPDF(fees: FeeSummaryData[], schoolInfo: { name: string; city: string }) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(schoolInfo.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${schoolInfo.city} Campus  •   Billing & Invoices Summary`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FEE BILLING INVOICES SUMMARY LEDGER", 14, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, 53);

  const tableData = fees.map((f, idx) => [
    idx + 1,
    f.studentName,
    f.class,
    f.feeType,
    `Rs. ${f.amount.toLocaleString()}`,
    `Rs. ${f.paidAmount.toLocaleString()}`,
    f.status.toUpperCase(),
    f.dueDate,
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["#", "Student Name", "Class", "Type", "Amount", "Paid Amount", "Status", "Due Date"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });

  doc.save("fees-summary-ledger.pdf");
}

// 7. Export Report Card PDF
export function exportReportCardPDF(reportData: ReportCardData, school: { name: string; address: string }) {
  const doc = new jsPDF();

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(school.name.toUpperCase(), 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(school.address, 14, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`REPORT CARD - ${reportData.term.toUpperCase()}`, 14, 38);

  autoTable(doc, {
    startY: 44,
    body: [
      [`Student Name: ${reportData.studentName}`, `Class / Room: ${reportData.className}`],
      [`Roll Number: #${reportData.rollNumber}`, `Admission Code: ${reportData.admissionNumber}`],
      [`Academic Year: ${reportData.academicYear}`, `School Term: ${reportData.term}`],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const tableData = reportData.subjects.map((sub) => [
    sub.subject,
    sub.totalMarks,
    sub.obtainedMarks,
    `${sub.percentage}%`,
    sub.grade,
    sub.remarks || "-",
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Subject Details", "Max Marks", "Obtained", "Percentage", "Letter Grade", "Comments"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  doc.setFillColor(243, 244, 246);
  doc.rect(14, finalY + 8, 182, 18, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Cumulative GPA: ${reportData.gpa.toFixed(2)} / 4.0`, 20, finalY + 19);
  doc.text(`Percentage Average: ${reportData.averagePercentage}%`, 80, finalY + 19);
  doc.text(`Attendance Rate: ${reportData.attendanceRate}%`, 140, finalY + 19);

  if (reportData.aiComment) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("AI CLASSROOM PERFORMANCE EVALUATION REMARKS:", 14, finalY + 36);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    
    const splitText = doc.splitTextToSize(reportData.aiComment, 180);
    doc.text(splitText, 14, finalY + 42);
  }

  const footerY = 270;
  doc.line(14, footerY, 70, footerY);
  doc.line(140, footerY, 196, footerY);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(reportData.classTeacherName || "CLASS TEACHER SIGNATURE", 14, footerY + 5);
  doc.text(reportData.principalName || "PRINCIPAL SIGNATURE", 140, footerY + 5);

  doc.save(`report-card-${reportData.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// 8. Export Exam Results PDF
export function exportExamResultsPDF(
  results: ExamResult[],
  exam: { title: string; date: string; totalMarks: number },
  classInfo: { name: string; section: string }
) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EXAM RESULTS TRANSCRIPTS LEDGER", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Class: ${classInfo.name}-${classInfo.section}  •  Exam Particulars: ${exam.title}`, 14, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("EXAM PERFORMANCE LEDGER", 14, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Maximum Marks: ${exam.totalMarks}  •  Date: ${exam.date}`, 14, 51);

  const sorted = [...results].sort((a, b) => b.obtainedMarks - a.obtainedMarks);

  const tableData = sorted.map((s, idx) => [
    idx + 1,
    s.studentName,
    s.rollNumber || "-",
    `${s.obtainedMarks} / ${s.totalMarks}`,
    `${s.percentage}%`,
    s.grade,
  ]);

  autoTable(doc, {
    startY: 56,
    head: [["Rank", "Student Name", "Roll No", "Obtained Marks", "Percentage", "Grade"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 },
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  const totalCount = results.length;
  const averageObtained = totalCount > 0 ? results.reduce((acc, curr) => acc + curr.obtainedMarks, 0) / totalCount : 0;
  const averagePct = totalCount > 0 ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / totalCount) : 0;
  const passingScore = exam.totalMarks * 0.4;
  const passCount = results.filter(r => r.obtainedMarks >= passingScore).length;
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  doc.setFillColor(243, 244, 246);
  doc.rect(14, finalY + 8, 182, 18, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total Students: ${totalCount}`, 20, finalY + 19);
  doc.text(`Class Average: ${averageObtained.toFixed(1)} / ${exam.totalMarks} (${averagePct}%)`, 70, finalY + 19);
  doc.text(`Class Passing Rate: ${passRate}%`, 150, finalY + 19);

  doc.save(`results-${exam.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
