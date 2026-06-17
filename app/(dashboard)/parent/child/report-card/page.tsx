"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Layers,
  Loader2,
  Printer,
  Download,
  School,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubjectPerformance {
  subject: string;
  marks: number;
  total: number;
  grade: string;
  remarks: string;
}

interface ReportCardData {
  studentId: string;
  studentName: string;
  rollNumber: string;
  admissionNumber: string;
  className: string;
  academicYear: string;
  term: string;
  subjects: SubjectPerformance[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number;
  overallGrade: string;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
  aiComment: string;
  classTeacherName: string;
  principalName: string;
  nextTermBeginDate: string;
}

export default function ParentReportCardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const childId = searchParams.get("childId");
  const [academicYear, setAcademicYear] = useState<string>("2025-2026");
  const [term, setTerm] = useState<string>("First Term");

  const [loading, setLoading] = useState<boolean>(true);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);

  // Fetch report card on parameter change
  useEffect(() => {
    if (!childId) return;

    const fetchReportCard = async () => {
      setLoading(true);
      setReportCard(null);
      try {
        const res = await fetch(
          `/api/parent/report-card?studentId=${childId}&term=${term}&academicYear=${academicYear}&devUserId=parent-id`
        );
        const data = await res.json();
        if (res.ok) {
          setReportCard(data.reportCard);
        } else {
          // If not found, that means it's not published yet
          setReportCard(null);
        }
      } catch (err) {
        console.error("Error loading report card:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportCard();
  }, [childId, term, academicYear]);

  // Dynamic script loader for jsPDF
  const loadLibrary = async (src: string) => {
    return new Promise((resolve) => {
      if ((window as any).jspdf && src.includes("jspdf")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Download PDF file
  const handleDownloadPDF = async () => {
    if (!reportCard) return;
    setPdfLoading(true);

    try {
      await loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      if (!(window as any).jspdf) {
        toast.error("Failed to load PDF script. Check your internet connection.");
        return;
      }

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("AL-NOOR SCHOOL", 105, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("123 Education Street, Gulberg, Lahore, Pakistan", 105, 26, { align: "center" });

      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 32, 195, 32);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("STUDENT PROGRESS REPORT", 105, 42, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Academic Year: ${reportCard.academicYear}   |   Term: ${reportCard.term}`, 105, 48, { align: "center" });

      doc.line(15, 52, 195, 52);

      // Info Block
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("STUDENT INFORMATION", 15, 61);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text(`Name: ${reportCard.studentName}`, 15, 68);
      doc.text(`Class: ${reportCard.className}`, 15, 74);
      doc.text(`Roll Number: ${reportCard.rollNumber}`, 115, 68);
      doc.text(`Admission No: ${reportCard.admissionNumber}`, 115, 74);

      doc.line(15, 80, 195, 80);

      // Grades Table
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("ACADEMIC PERFORMANCE", 15, 89);

      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(15, 94, 180, 8, "F");
      doc.line(15, 94, 195, 94);
      doc.line(15, 102, 195, 102);

      doc.text("Subject Name", 18, 99.5);
      doc.text("Marks Obtained", 80, 99.5);
      doc.text("Grade", 125, 99.5);
      doc.text("Remarks", 155, 99.5);

      let y = 109;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      reportCard.subjects.forEach((s) => {
        doc.text(s.subject, 18, y);
        doc.text(`${s.marks}/${s.total}`, 80, y);
        doc.text(s.grade, 125, y);
        doc.text(s.remarks, 155, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });

      // Totals
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Overall Summary", 18, y + 1);
      doc.text(`${reportCard.totalMarksObtained}/${reportCard.totalMaxMarks} (${reportCard.overallPercentage}%)`, 80, y + 1);
      doc.text(reportCard.overallGrade, 125, y + 1);
      doc.text(getRemarks(reportCard.overallGrade), 155, y + 1);
      doc.line(15, y + 4, 195, y + 4);

      y += 12;

      // Attendance
      doc.text("ATTENDANCE RECORDS", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Present: ${reportCard.presentDays} days   |   Absent: ${reportCard.absentDays} days   |   Percentage: ${reportCard.attendanceRate}%`,
        15,
        y + 6
      );
      doc.line(15, y + 9, 195, y + 9);

      y += 18;

      // Comments
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("TEACHER'S EVALUATION REMARKS (AI Generated)", 15, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const splitComment = doc.splitTextToSize(reportCard.aiComment, 175);
      doc.text(splitComment, 15, y + 6);

      y += splitComment.length * 5 + 10;
      doc.line(15, y, 195, y);

      y += 12;

      // Signatures
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`Class Teacher: ${reportCard.classTeacherName}`, 15, y);
      doc.text(`Principal: ${reportCard.principalName}`, 115, y);

      y += 8;
      doc.line(15, y, 75, y);
      doc.line(115, y, 175, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Signature & Date", 15, y);
      doc.text("Signature & Date", 115, y);

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(124, 58, 237); // Purple-600
      doc.text(`Next Academic Term Begins: ${reportCard.nextTermBeginDate}`, 105, y, { align: "center" });

      doc.save(`Report_Card_${reportCard.studentName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Successfully generated and downloaded PDF Report Card!");
    } catch (e) {
      console.error(e);
      toast.error("Error creating PDF file.");
    } finally {
      setPdfLoading(false);
    }
  };

  const getRemarks = (grade: string) => {
    switch (grade) {
      case "A+": return "Outstanding";
      case "A": return "Excellent";
      case "B+": return "Very Good";
      case "B": return "Good";
      case "C": return "Satisfactory";
      default: return "Needs Improvement";
    }
  };

  if (!childId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white p-6 glass-card rounded-2xl max-w-xl mx-auto mt-12 border-white/[0.08]">
        <h3 className="text-xl font-bold text-rose-400">Parameter Error</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          No child ID specified. Please select a child from the portal navbar first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header controls */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-gray-800 bg-slate-900/40 text-gray-400 hover:text-white size-9 p-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="size-6 text-purple-400" />
              Academic Report Card
            </h1>
          </div>
        </div>

        {reportCard && (
          <div className="flex gap-2">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-gray-800 bg-slate-955 text-gray-200 hover:bg-slate-800 text-xs h-9"
            >
              <Printer className="size-3.5 mr-1" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="bg-purple-650 hover:bg-purple-550 text-white text-xs h-9 font-medium shadow-md shadow-purple-500/10"
            >
              {pdfLoading ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Download className="size-3.5 mr-1" />
              )}
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {/* Select Parameters Box (Hidden when printing) */}
      <Card className="no-print glass-card border-gray-800 bg-slate-900/20">
        <div className="p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-450 uppercase font-bold">Academic Year</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="px-2 h-8 rounded border border-gray-800 bg-slate-955 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-450 uppercase font-bold">Academic Term</span>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="px-2 h-8 rounded border border-gray-800 bg-slate-955 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Final Term">Final Term</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Report view loading/publishing state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 text-purple-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium">Fetching report card details...</span>
        </div>
      ) : !reportCard ? (
        <Card className="glass-card border-gray-800 bg-slate-900/20 max-w-xl mx-auto mt-6">
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="size-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Report Card Not Published</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              No report card has been published for your child for the selected term **({term} - {academicYear})** yet.
              Please contact the school administration for updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="glass-card border-gray-800 bg-slate-900/10 text-slate-100 p-8 max-w-3xl mx-auto rounded-2xl shadow-xl border print-report-card">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-850 pb-4">
            <div className="flex items-center gap-3">
              <School className="size-8 text-purple-400" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">Al-Noor School</h2>
                <p className="text-[10px] text-gray-500">Gulberg, Lahore, Pakistan</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                Progress Report
              </span>
              <p className="text-xs text-gray-400 mt-1.5">
                Year: {reportCard.academicYear} | Term: {reportCard.term}
              </p>
            </div>
          </div>

          {/* Student Info Block */}
          <div className="grid grid-cols-2 gap-4 text-xs mt-6 border-b border-gray-850 pb-4">
            <div className="space-y-1">
              <p className="text-gray-400"><strong className="text-gray-200">Student Name:</strong> {reportCard.studentName}</p>
              <p className="text-gray-400"><strong className="text-gray-200">Class & Sec:</strong> {reportCard.className}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-gray-400"><strong className="text-gray-200">Roll Number:</strong> {reportCard.rollNumber}</p>
              <p className="text-gray-400"><strong className="text-gray-200">Admission No:</strong> {reportCard.admissionNumber}</p>
            </div>
          </div>

          {/* Grades Table */}
          <div className="mt-6">
            <h3 className="text-xs uppercase font-bold text-gray-355 tracking-wider mb-3">Academic Performance</h3>
            <div className="overflow-hidden border border-gray-850 rounded-xl bg-slate-955/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 bg-slate-955 text-gray-300 font-semibold uppercase text-[10px]">
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-center">Marks Obtained</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/50">
                  {reportCard.subjects.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/10">
                      <td className="p-3 font-semibold text-gray-200">{s.subject}</td>
                      <td className="p-3 text-center text-gray-300">{s.marks}/{s.total}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "px-1.5 py-0.2 rounded font-bold font-mono",
                          ["A+", "A"].includes(s.grade) ? "text-emerald-400" : ["B+", "B"].includes(s.grade) ? "text-blue-400" : "text-amber-400"
                        )}>
                          {s.grade}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-400">{s.remarks}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-800 bg-slate-955/40 font-bold">
                    <td className="p-3 text-white">Overall Summary</td>
                    <td className="p-3 text-center text-white">{reportCard.totalMarksObtained}/{reportCard.totalMaxMarks} ({reportCard.overallPercentage}%)</td>
                    <td className="p-3 text-center text-purple-400 font-mono">{reportCard.overallGrade}</td>
                    <td className="p-3 text-right text-emerald-400">{getRemarks(reportCard.overallGrade)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance */}
          <div className="mt-6 border-b border-gray-850 pb-4 text-xs">
            <h3 className="text-xs uppercase font-bold text-gray-355 tracking-wider mb-2">Attendance Records</h3>
            <p className="text-gray-400">
              Present Days: <strong className="text-white">{reportCard.presentDays} days</strong> | 
              Absent Days: <strong className="text-white">{reportCard.absentDays} days</strong> | 
              Attendance Rate: <strong className="text-purple-400">{reportCard.attendanceRate}%</strong>
            </p>
          </div>

          {/* AI Comments Block */}
          <div className="mt-6 text-xs pb-6 border-b border-gray-850">
            <h3 className="text-xs uppercase font-bold text-gray-355 tracking-wider mb-2">Teacher Evaluation Remarks</h3>
            <p className="text-gray-300 italic leading-relaxed border-l-2 border-purple-500/40 pl-3">
              "{reportCard.aiComment}"
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-xs pt-8">
            <div>
              <p className="text-gray-400">Class Teacher: <strong className="text-white">{reportCard.classTeacherName}</strong></p>
              <div className="w-48 h-0.5 bg-gray-800 mt-8 mb-1" />
              <span className="text-[9px] text-gray-500">Signature & Date</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-gray-400">Principal: <strong className="text-white">{reportCard.principalName}</strong></p>
              <div className="w-48 h-0.5 bg-gray-800 mt-8 mb-1" />
              <span className="text-[9px] text-gray-500">Signature & Date</span>
            </div>
          </div>

          <div className="text-center text-[10px] font-bold text-purple-400 tracking-wider mt-8 uppercase">
            Next Term Begins: {reportCard.nextTermBeginDate}
          </div>
        </div>
      )}

      {/* Embedded print styling for browser compatibility */}
      <style jsx global>{`
        @media print {
          .no-print,
          nav,
          header,
          aside,
          button,
          .bg-slate-900\/80 {
            display: none !important;
          }
          body,
          main {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-report-card {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1.5cm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-report-card h2,
          .print-report-card h3,
          .print-report-card td,
          .print-report-card th,
          .print-report-card strong,
          .print-report-card p {
            color: black !important;
          }
          .print-report-card table {
            border: 1px solid #cbd5e1 !important;
          }
          .print-report-card tr {
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .print-report-card th {
            background-color: #f8fafc !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
}
