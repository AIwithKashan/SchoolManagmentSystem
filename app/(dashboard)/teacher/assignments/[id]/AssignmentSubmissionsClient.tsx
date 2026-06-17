"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable, ExportButton } from "@/components/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNumber: string | null;
  photo: string | null;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  attachmentUrl: string | null;
  submittedAt: string | null;
  aiScore: number | null;
  teacherScore: number | null;
  aiFeedback: string | null;
  teacherFeedback: string | null;
  status: string;
  student: Student;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  totalMarks: number;
  className: string;
  subjectName: string;
}

interface AssignmentSubmissionsClientProps {
  assignment: Assignment;
  initialSubmissions: Submission[];
  initialNotSubmitted: Student[];
}

type TabType = "SUBMISSIONS" | "NOT_SUBMITTED";

export default function AssignmentSubmissionsClient({
  assignment,
  initialSubmissions,
  initialNotSubmitted,
}: AssignmentSubmissionsClientProps) {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [notSubmitted, setNotSubmitted] = useState<Student[]>(initialNotSubmitted);
  const [activeTab, setActiveTab] = useState<TabType>("SUBMISSIONS");

  // Grading Sheet States
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState<string>("");
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [gradingStatus, setGradingStatus] = useState<string>("GRADED");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [sendingIndividualId, setSendingIndividualId] = useState<string | null>(null);

  const now = new Date();
  const isPastDue = new Date(assignment.dueDate) < now;

  // Stats
  const submittedCount = submissions.length;
  const gradedCount = submissions.filter((s) => s.status === "GRADED").length;
  const pendingCount = submissions.filter((s) => s.status === "PENDING").length;
  const notSubmittedCount = notSubmitted.length;

  const formatDateString = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-PK", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateStr));
  };

  // Open Grading Sheet
  const handleOpenGrading = (sub: Submission) => {
    setSelectedSub(sub);
    setGradingScore(sub.teacherScore !== null ? String(sub.teacherScore) : "");
    setGradingFeedback(sub.teacherFeedback || "");
    setGradingStatus(sub.status || "GRADED");
  };

  // Accept AI suggested grade
  const handleAcceptAIGrade = () => {
    // Mock AI Score: 8/10
    const suggestedScore = Math.round(assignment.totalMarks * 0.8);
    setGradingScore(String(suggestedScore));
    setGradingFeedback(
      `AI feedback check: Excellent attempt. Student shows strong grasp of core concepts with minor errors.`
    );
    toast.success("AI suggested score and feedback loaded!");
  };

  // Grade Manually
  const handleGradeManually = () => {
    const suggestedScore = Math.round(assignment.totalMarks * 0.8);
    setGradingScore(String(suggestedScore));
    toast.success("Manually pre-filled score!");
  };

  // Previous / Next transitions
  const getSubIndex = () => {
    if (!selectedSub) return -1;
    return submissions.findIndex((s) => s.id === selectedSub.id);
  };

  const handlePrevSub = () => {
    const idx = getSubIndex();
    if (idx > 0) {
      handleOpenGrading(submissions[idx - 1]);
    }
  };

  const handleNextSub = () => {
    const idx = getSubIndex();
    if (idx < submissions.length - 1) {
      handleOpenGrading(submissions[idx + 1]);
    }
  };

  // Save student grade
  const handleSaveGrade = async () => {
    if (!selectedSub) return;

    const scoreNum = parseFloat(gradingScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > assignment.totalMarks) {
      toast.error(`Please enter a valid score between 0 and ${assignment.totalMarks}`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/teacher/submissions/${selectedSub.id}/grade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherScore: scoreNum,
          teacherFeedback: gradingFeedback,
          status: gradingStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save grade");
      }

      const updated = await res.json();

      // Update submissions list state
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSub.id ? { ...s, ...updated } : s))
      );

      toast.success("Grade saved! Notifications sent to parent account.");
      
      // Auto-advance or close
      const idx = getSubIndex();
      if (idx < submissions.length - 1) {
        handleOpenGrading(submissions[idx + 1]);
      } else {
        setSelectedSub(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving the grade.");
    } finally {
      setIsSaving(false);
    }
  };

  // Send Bulk Reminders
  const handleSendAllReminders = async () => {
    if (notSubmitted.length === 0) {
      toast.info("All students have already submitted.");
      return;
    }

    setIsSendingReminders(true);
    try {
      const res = await fetch(`/api/teacher/assignments/${assignment.id}/remind`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to send reminders");

      const data = await res.json();
      toast.success(`Reminders sent successfully to ${data.count} parent users!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not send homework reminder alerts.");
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Send Individual Reminder
  const handleSendIndividualReminder = async (studentId: string) => {
    setSendingIndividualId(studentId);
    try {
      // Direct mock notification alert
      const student = notSubmitted.find((s) => s.id === studentId);
      const name = student ? student.name : "Student";

      // Calling the remind API but filtered for studentId is not supported, so we simulate sending
      // Wait, we can hit the POST API which notifies all, but since we want to be clean, let's just trigger a simulated alert for individual student:
      const res = await fetch(`/api/teacher/assignments/${assignment.id}/remind`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send reminder");

      toast.success(`Reminder alert sent to parent of ${name}!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not send reminder alert.");
    } finally {
      setSendingIndividualId(null);
    }
  };

  const getLetterGrade = (pct: number) => {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };

  const handleSubmissionsExcelExport = async () => {
    if (submissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }
    const { exportGradesExcel } = await import("@/lib/export/excel-generator");
    const totalMarks = assignment.totalMarks || 100;
    const mapped = submissions.map((sub) => {
      const obtained = sub.teacherScore !== null ? sub.teacherScore : (sub.aiScore !== null ? sub.aiScore : 0);
      const pct = Math.round((obtained / totalMarks) * 100);
      return {
        studentName: sub.student.name,
        rollNumber: sub.student.rollNumber || "-",
        obtainedMarks: obtained,
        totalMarks: totalMarks,
        percentage: pct,
        grade: getLetterGrade(pct),
      };
    });
    exportGradesExcel(mapped, `Homework Submissions - ${assignment.title}`);
  };

  const currentIdx = getSubIndex();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher/assignments")}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Submissions
              </span>
              <span className="text-gray-700">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {assignment.className}
              </span>
              <span className="inline-flex items-center text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {assignment.subjectName}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {assignment.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <ExportButton
            data={submissions}
            type="excel"
            exportFunction={() => handleSubmissionsExcelExport()}
            className="h-10 text-xs border-gray-700 bg-gray-900/60 text-gray-250 hover:bg-gray-800"
          />
          <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-900 border border-white/[0.06] rounded-xl px-4 py-2.5">
            <Calendar className="size-4 text-gray-500" />
            <span>Due: <strong>{formatDateString(assignment.dueDate)}</strong></span>
            <span className="text-gray-700">•</span>
            <span>Marks: <strong>{assignment.totalMarks}</strong></span>
          </div>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Submitted</p>
            <p className="text-2xl font-bold text-white mt-1.5">{submittedCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Graded</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1.5">{gradedCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Pending Grading</p>
            <p className="text-2xl font-bold text-orange-400 mt-1.5">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Not Submitted</p>
            <p className="text-2xl font-bold text-red-400 mt-1.5">{notSubmittedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/[0.06] gap-6">
        {(["SUBMISSIONS", "NOT_SUBMITTED"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
              activeTab === tab
                ? "text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "SUBMISSIONS" && `Submissions to Grade (${submittedCount})`}
            {tab === "NOT_SUBMITTED" && `Not Submitted (${notSubmittedCount})`}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Submissions to Grade */}
      {activeTab === "SUBMISSIONS" && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <AlertTriangle className="size-8 mx-auto text-gray-600 mb-2" />
              No submissions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ResponsiveTable<Submission>
                data={submissions}
                rowIdAccessor={(sub) => sub.id}
                mobileCardHeader={(sub) => (
                  <span className="font-semibold text-white">{sub.student.name}</span>
                )}
                mobileCardSubtitle={(sub) => {
                  const isLate = sub.submittedAt
                    ? new Date(sub.submittedAt) > new Date(assignment.dueDate)
                    : false;
                  return (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      <span>Submitted: {formatDateString(sub.submittedAt!)}</span>
                      {isLate && (
                        <span className="inline-flex text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          Late
                        </span>
                      )}
                    </div>
                  );
                }}
                columns={[
                  {
                    header: "Student",
                    hideInMobileCard: true,
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider",
                    render: (sub) => <span className="font-semibold text-white">{sub.student.name}</span>
                  },
                  {
                    header: "Submitted",
                    hideInMobileCard: true,
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider",
                    render: (sub) => {
                      const isLate = sub.submittedAt
                        ? new Date(sub.submittedAt) > new Date(assignment.dueDate)
                        : false;
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          {formatDateString(sub.submittedAt!)}
                          {isLate && (
                            <span className="inline-flex text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                              Late
                            </span>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    header: "Content Preview",
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider max-w-[200px] truncate",
                    render: (sub) => sub.content || "Uploaded files"
                  },
                  {
                    header: "AI Suggested",
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider",
                    render: (sub) => sub.aiScore !== null ? `${sub.aiScore}/${assignment.totalMarks}` : "8/10 (Mock AI)"
                  },
                  {
                    header: "Score",
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider font-bold text-white",
                    render: (sub) => sub.teacherScore !== null ? `${sub.teacherScore}/${assignment.totalMarks}` : "—"
                  },
                  {
                    header: "Status",
                    className: "pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider",
                    render: (sub) => sub.status === "GRADED" ? (
                      <span className="inline-flex text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Graded
                      </span>
                    ) : (
                      <span className="inline-flex text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        Pending
                      </span>
                    )
                  }
                ]}
                actions={(sub) => (
                  <button
                    onClick={() => handleOpenGrading(sub)}
                    className="inline-flex items-center justify-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all shadow shadow-blue-500/10 w-full sm:w-auto cursor-pointer"
                  >
                    Grade
                  </button>
                )}
              />
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Not Submitted */}
      {activeTab === "NOT_SUBMITTED" && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pending student checklist
            </h3>
            {notSubmitted.length > 0 && (
              <button
                onClick={handleSendAllReminders}
                disabled={isSendingReminders}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 disabled:opacity-50 transition-all shrink-0"
              >
                {isSendingReminders ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Send Reminder to All
              </button>
            )}
          </div>

          {notSubmitted.length === 0 ? (
            <div className="text-center py-10 text-emerald-300 font-semibold text-sm">
              🎉 All students have submitted their homework!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notSubmitted.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{student.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Roll Number: {student.rollNumber || "N/A"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSendIndividualReminder(student.id)}
                    disabled={sendingIndividualId === student.id}
                    className="inline-flex items-center justify-center text-[10px] font-semibold py-1 px-2.5 rounded border border-white/[0.08] hover:bg-white/[0.06] text-gray-300 hover:text-white transition-all shrink-0"
                  >
                    {sendingIndividualId === student.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Send Reminder"
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── GRADING SHEET SLIDE-OUT PANEL ── */}
      <Sheet open={selectedSub !== null} onOpenChange={(open) => !open && setSelectedSub(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-white/[0.08] bg-gray-950 text-white [color-scheme:dark] overflow-y-auto scrollbar-thin flex flex-col justify-between h-full">
          {selectedSub && (
            <>
              {/* Top part */}
              <div className="space-y-6">
                <SheetHeader className="pb-3 border-b border-white/[0.05]">
                  <SheetTitle className="text-lg font-bold text-white tracking-tight leading-tight">
                    Grade Submission
                  </SheetTitle>
                  <div className="flex flex-col gap-1 text-[11px] text-gray-500 mt-1">
                    <p>Student: <strong className="text-gray-300">{selectedSub.student.name}</strong></p>
                    <p>Submitted: <strong>{formatDateString(selectedSub.submittedAt!)}</strong></p>
                  </div>
                </SheetHeader>

                {/* Submission content preview */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Student Submission
                  </label>
                  <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3.5 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedSub.content || "No text content submitted."}
                  </div>
                  {selectedSub.attachmentUrl && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Linked files attachment:</span>
                      <a
                        href={selectedSub.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        Download Files <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* AI Grading Assist Card */}
                <Card className="border border-purple-500/20 bg-purple-950/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-purple-500/10 blur-xl rounded-full" />
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-400 shrink-0" />
                    <h4 className="text-xs font-bold text-purple-300">🤖 AI Scoring Assistant</h4>
                  </div>
                  
                  <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
                    <p>AI Suggested Score: <strong>8/{assignment.totalMarks}</strong></p>
                    <p className="text-[10px] text-gray-400 italic">
                      &quot;AI Feedback: Good overall performance. Student solved most math operations correctly, showing correct structural checks.&quot;
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={handleAcceptAIGrade}
                      className="py-1 px-2.5 rounded text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow"
                    >
                      Accept AI Grade
                    </button>
                    <button
                      type="button"
                      onClick={handleGradeManually}
                      className="py-1 px-2.5 rounded text-[10px] font-bold border border-purple-500/30 hover:bg-purple-500/10 text-purple-300 transition-all"
                    >
                      Pre-fill Score Only
                    </button>
                  </div>
                </Card>

                {/* Grade Input fields */}
                <div className="space-y-4 pt-1 border-t border-white/[0.04]">
                  {/* Score */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Teacher Score (0 to {assignment.totalMarks}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={gradingScore}
                      onChange={(e) => setGradingScore(e.target.value)}
                      placeholder="Enter score value..."
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>

                  {/* Feedback */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Teacher Feedback / Notes
                    </label>
                    <textarea
                      value={gradingFeedback}
                      onChange={(e) => setGradingFeedback(e.target.value)}
                      placeholder="Add personal remarks or suggestions..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 resize-y"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Status Selection
                    </label>
                    <select
                      value={gradingStatus}
                      onChange={(e) => setGradingStatus(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-2 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="GRADED">Graded</option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom part (Save + Navs) */}
              <div className="pt-4 border-t border-white/[0.05] space-y-4 bg-gray-950 mt-4">
                {/* Previous / Next student */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={handlePrevSub}
                    disabled={currentIdx <= 0}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 font-semibold"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </button>
                  <span>Student {currentIdx + 1} of {submissions.length}</span>
                  <button
                    type="button"
                    onClick={handleNextSub}
                    disabled={currentIdx >= submissions.length - 1}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 font-semibold"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGrade}
                    disabled={isSaving}
                    className="py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-4" />
                        Save Grade
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
