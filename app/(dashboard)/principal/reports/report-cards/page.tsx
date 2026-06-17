"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle,
  Printer,
  Download,
  Check,
  Edit2,
  Trash2,
  School,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

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

interface ProgressStep {
  message: string;
  percentage: number;
  current?: number;
  total?: number;
  done?: boolean;
}

export default function ReportCardsPage() {
  const router = useRouter();

  // Selection states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2025-2026");
  const [term, setTerm] = useState<string>("First Term");

  // Flow states
  const [loading, setLoading] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  const [reportCards, setReportCards] = useState<ReportCardData[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/principal/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || []);
          if (data.classes?.length > 0) {
            setClassId(data.classes[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Utility to dynamically load CDN JS scripts (jsPDF and JSZip)
  const loadLibrary = async (src: string) => {
    return new Promise((resolve) => {
      if ((window as any).JSZip && src.includes("jszip")) {
        resolve(true);
        return;
      }
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

  // Generate Report Cards via SSE (Server-Sent Events)
  const handleGeneratePreview = async () => {
    if (!classId || !term || !academicYear) {
      toast.error("Please fill in all parameter selection fields.");
      return;
    }

    setLoading(true);
    setReportCards([]);
    setProgress({ message: "Connecting to server...", percentage: 5 });

    try {
      const response = await fetch("/api/principal/report-cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, term, academicYear }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to read progress stream.");
      }

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        // Keep the last partial chunk in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse EventSource format:
          // event: progress
          // data: {"message": ...}
          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.+)/m);

          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          const rawData = dataMatch[1];

          try {
            const parsedData = JSON.parse(rawData);

            if (eventType === "progress") {
              setProgress(parsedData);
            } else if (eventType === "complete") {
              setReportCards(parsedData.reportCards || []);
              setProgress(null);
            } else if (eventType === "error") {
              toast.error(parsedData.message || "Failed during generation.");
              setProgress(null);
            }
          } catch (e) {
            console.error("Chunk parsing error:", e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Report card generation failed.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Update inline comment edits
  const handleCommentChange = (idx: number, newComment: string) => {
    const updated = [...reportCards];
    updated[idx].aiComment = newComment;
    setReportCards(updated);
  };

  // Submit approved report cards to API
  const handleApproveAndSend = async () => {
    if (reportCards.length === 0) return;
    setApproving(true);
    try {
      const res = await fetch("/api/principal/report-cards/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportCards,
          term,
          academicYear,
        }),
      });
      if (res.ok) {
        toast.success(`Approved and published report cards to parents successfully!`);
        setIsEditing(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Approval failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to publish report cards.");
    } finally {
      setApproving(false);
    }
  };

  // Generate jsPDF printable file for a single card
  const generatePDFBytes = (card: ReportCardData) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    // 1. Header
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

    // 2. Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("STUDENT PROGRESS REPORT", 105, 42, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Academic Year: ${card.academicYear}   |   Term: ${card.term}`, 105, 48, { align: "center" });

    doc.line(15, 52, 195, 52);

    // 3. Info Block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT INFORMATION", 15, 61);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.text(`Name: ${card.studentName}`, 15, 68);
    doc.text(`Class: ${card.className}`, 15, 74);
    doc.text(`Roll Number: ${card.rollNumber}`, 115, 68);
    doc.text(`Admission No: ${card.admissionNumber}`, 115, 74);

    doc.line(15, 80, 195, 80);

    // 4. Grades Table
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

    card.subjects.forEach((s) => {
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
    doc.text(`${card.totalMarksObtained}/${card.totalMaxMarks} (${card.overallPercentage}%)`, 80, y + 1);
    doc.text(card.overallGrade, 125, y + 1);
    doc.text(getRemarks(card.overallGrade), 155, y + 1);
    doc.line(15, y + 4, 195, y + 4);

    y += 12;

    // 5. Attendance Block
    doc.text("ATTENDANCE RECORDS", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Present: ${card.presentDays} days   |   Absent: ${card.absentDays} days   |   Percentage: ${card.attendanceRate}%`, 15, y + 6);
    doc.line(15, y + 9, 195, y + 9);

    y += 18;

    // 6. Comments Block
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("TEACHER'S EVALUATION REMARKS (AI Generated)", 15, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const splitComment = doc.splitTextToSize(card.aiComment, 175);
    doc.text(splitComment, 15, y + 6);

    y += splitComment.length * 5 + 10;
    doc.line(15, y, 195, y);

    y += 12;

    // 7. Signature Lines
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(`Class Teacher: ${card.classTeacherName}`, 15, y);
    doc.text(`Principal: ${card.principalName}`, 115, y);

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
    doc.text(`Next Academic Term Begins: ${card.nextTermBeginDate}`, 105, y, { align: "center" });

    return doc.output("arraybuffer");
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

  // Compile PDF report cards and download as a single ZIP folder
  const handleDownloadZIP = async () => {
    if (reportCards.length === 0) return;
    setPdfLoading(true);

    try {
      await loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      await loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

      if (!(window as any).jspdf || !(window as any).JSZip) {
        toast.error("Failed to load PDF compilation scripts dynamically. Check connection.");
        return;
      }

      const zip = new (window as any).JSZip();

      reportCards.forEach((card) => {
        const buffer = generatePDFBytes(card);
        const nameCleaned = card.studentName.replace(/\s+/g, "_");
        zip.file(`Report_Card_${nameCleaned}.pdf`, buffer);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Report_Cards_Class_${classId}_${term.replace(/\s+/g, "_")}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Successfully generated and downloaded Report Cards ZIP archive!");
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during ZIP creation.");
    } finally {
      setPdfLoading(false);
    }
  };

  // Print cards
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Selection controls (Hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="size-8 text-purple-400" />
            AI Report Card Generator
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Generate printable progress reports featuring personalized, AI-written evaluations.
          </p>
        </div>
      </div>

      {/* Select Parameters Box (Hidden when printing) */}
      <Card className="no-print glass-card border-gray-800 bg-slate-900/20">
        <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="size-4 text-purple-400" />
            Select Generation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Academic Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-450 tracking-wider">Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-800 bg-slate-955 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            {/* Term */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-450 tracking-wider">Academic Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-800 bg-slate-955 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Final Term">Final Term</option>
              </select>
            </div>

            {/* Class Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-450 tracking-wider">Target Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-800 bg-slate-955 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleGeneratePreview}
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs h-10 rounded-lg shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating Report Cards...
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4" />
                Generate Progress Reports
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* SSE Timeline Progress Indicator (Hidden when printing) */}
      {loading && progress && (
        <Card className="no-print glass-card border-gray-800 bg-slate-900/20 max-w-md mx-auto">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <Loader2 className="size-8 text-purple-500 animate-spin" />
            <div className="w-full space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
                <span>{progress.message}</span>
                <span className="font-mono">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-850 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action panel (Hidden when printing) */}
      {reportCards.length > 0 && !loading && (
        <div className="no-print flex flex-wrap justify-between items-center gap-3 p-4 bg-slate-900/40 border border-gray-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="size-4" />
              Generated {reportCards.length} report cards
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="border-gray-800 bg-slate-950/20 text-gray-300 hover:bg-slate-800 text-xs h-9"
            >
              <Edit2 className="size-3.5 mr-1" />
              {isEditing ? "Disable Editing" : "✏️ Edit Comments"}
            </Button>

            <Button
              onClick={handlePrintAll}
              variant="outline"
              className="border-gray-800 bg-slate-955 text-gray-200 hover:bg-slate-800 text-xs h-9"
            >
              <Printer className="size-3.5 mr-1" />
              🖨️ Print All
            </Button>

            <Button
              onClick={handleDownloadZIP}
              disabled={pdfLoading}
              variant="outline"
              className="border-purple-800/30 bg-purple-550/10 text-purple-300 hover:bg-purple-600/20 text-xs h-9"
            >
              {pdfLoading ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Download className="size-3.5 mr-1" />
              )}
              📄 Download All (ZIP)
            </Button>

            <Button
              onClick={handleApproveAndSend}
              disabled={approving}
              className="bg-emerald-650 hover:bg-emerald-550 text-white text-xs h-9 font-medium shadow-md shadow-emerald-500/10"
            >
              {approving ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Check className="size-3.5 mr-1" />
              )}
              ✅ Approve & Send to Parents
            </Button>
          </div>
        </div>
      )}

      {/* Printable Report Cards layout */}
      <div className="space-y-12 print-container">
        {reportCards.map((card, idx) => (
          <div
            key={card.studentId}
            className="page-break glass-card border-gray-800 bg-slate-900/10 text-slate-100 p-8 max-w-3xl mx-auto rounded-2xl shadow-xl border print-report-card"
          >
            {/* Printable Header */}
            <div className="flex justify-between items-center border-b border-gray-850 pb-4">
              <div className="flex items-center gap-3">
                <School className="size-8 text-purple-400 print-school-logo" />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white uppercase print-school-name">Al-Noor School</h2>
                  <p className="text-[10px] text-gray-500 print-school-address">Gulberg, Lahore, Pakistan</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full print-tag">
                  Progress Report
                </span>
                <p className="text-xs text-gray-400 mt-1.5 print-header-meta">
                  Year: {card.academicYear} | Term: {card.term}
                </p>
              </div>
            </div>

            {/* Student Info Block */}
            <div className="grid grid-cols-2 gap-4 text-xs mt-6 border-b border-gray-850 pb-4 print-info-grid">
              <div className="space-y-1">
                <p className="text-gray-400"><strong className="text-gray-200">Student Name:</strong> {card.studentName}</p>
                <p className="text-gray-400"><strong className="text-gray-200">Class & Sec:</strong> {card.className}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-gray-400"><strong className="text-gray-200">Roll Number:</strong> {card.rollNumber}</p>
                <p className="text-gray-400"><strong className="text-gray-200">Admission No:</strong> {card.admissionNumber}</p>
              </div>
            </div>

            {/* Grades Table */}
            <div className="mt-6">
              <h3 className="text-xs uppercase font-bold text-gray-350 tracking-wider mb-3">Academic Performance</h3>
              <div className="overflow-hidden border border-gray-850 rounded-xl bg-slate-950/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-850 bg-slate-955 text-gray-300 font-semibold uppercase text-[10px]">
                      <th className="p-3">Subject</th>
                      <th className="p-3 text-center">Marks Obtained</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3 text-right">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850/50">
                    {card.subjects.map((s, sIdx) => (
                      <tr key={sIdx} className="hover:bg-slate-800/10">
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
                    {/* Overall Score */}
                    <tr className="border-t border-gray-800 bg-slate-950/40 font-bold">
                      <td className="p-3 text-white">Overall Summary</td>
                      <td className="p-3 text-center text-white">{card.totalMarksObtained}/{card.totalMaxMarks} ({card.overallPercentage}%)</td>
                      <td className="p-3 text-center text-purple-400 font-mono">{card.overallGrade}</td>
                      <td className="p-3 text-right text-emerald-400">{getRemarks(card.overallGrade)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance */}
            <div className="mt-6 border-b border-gray-850 pb-4 text-xs">
              <h3 className="text-xs uppercase font-bold text-gray-350 tracking-wider mb-2">Attendance Records</h3>
              <p className="text-gray-400">
                Present Days: <strong className="text-white">{card.presentDays} days</strong> | 
                Absent Days: <strong className="text-white">{card.absentDays} days</strong> | 
                Attendance Rate: <strong className="text-purple-400">{card.attendanceRate}%</strong>
              </p>
            </div>

            {/* AI Comments Block */}
            <div className="mt-6 text-xs pb-6">
              <h3 className="text-xs uppercase font-bold text-gray-350 tracking-wider mb-2">Teacher Evaluation Remarks (AI Generated)</h3>
              {isEditing ? (
                <textarea
                  value={card.aiComment}
                  onChange={(e) => handleCommentChange(idx, e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg border border-purple-500/40 bg-slate-950/80 text-gray-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none leading-relaxed shadow-inner"
                />
              ) : (
                <p className="text-gray-300 italic leading-relaxed border-l-2 border-purple-500/40 pl-3">
                  "{card.aiComment}"
                </p>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-gray-850/50 print-signature-block">
              <div>
                <p className="text-gray-400">Class Teacher: <strong className="text-white">{card.classTeacherName}</strong></p>
                <div className="w-48 h-0.5 bg-gray-800 mt-8 mb-1" />
                <span className="text-[9px] text-gray-500">Signature & Date</span>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-gray-400">Principal: <strong className="text-white">{card.principalName}</strong></p>
                <div className="w-48 h-0.5 bg-gray-800 mt-8 mb-1" />
                <span className="text-[9px] text-gray-500">Signature & Date</span>
              </div>
            </div>

            <div className="text-center text-[10px] font-bold text-purple-400 tracking-wider mt-8 uppercase print-footer-note">
              Next Term Begins: {card.nextTermBeginDate}
            </div>
          </div>
        ))}
      </div>

      {/* Embedded print styling for browser compatibility */}
      <style jsx global>{`
        @media print {
          /* Hide navigation layouts completely */
          .no-print,
          nav,
          header,
          aside,
          button,
          .bg-slate-900\/80,
          .border-b {
            display: none !important;
          }
          /* Expand content fully */
          body,
          main,
          .print-container {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          /* Printable card adjustments */
          .print-report-card {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 2rem !important;
            padding: 1.5cm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Typography print overrides */
          .print-report-card h2,
          .print-report-card h3,
          .print-report-card td,
          .print-report-card th,
          .print-report-card strong,
          .print-report-card p {
            color: black !important;
          }
          .print-school-logo {
            color: #7c3aed !important; /* purple tint */
          }
          /* Table print visibility */
          .print-report-card table {
            border: 1px solid #cbd5e1 !important; /* light grey border */
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
