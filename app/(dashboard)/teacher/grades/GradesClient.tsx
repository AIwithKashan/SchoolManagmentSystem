"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Loader2,
  Plus,
  Save,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ResponsiveTable, ExportButton } from "@/components/shared";

interface ClassSubjectItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string | null;
}

interface Exam {
  id: string;
  title: string;
  subjectId: string;
  subject: { name: string };
  totalMarks: number;
  passingMarks: number;
  examType: string;
  examDate: string;
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  remarks: string | null;
}

interface GradesClientProps {
  classSubjects: ClassSubjectItem[];
}

export default function GradesClient({ classSubjects }: GradesClientProps) {
  // Extract unique classes
  const classesMap = new Map<string, string>();
  classSubjects.forEach((item) => {
    classesMap.set(item.classId, item.className);
  });
  const classesList = Array.from(classesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Selected Class & Exam
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  // Fetched data
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [isLoadingClassData, setIsLoadingClassData] = useState(false);

  // Mark entry workbook input states (keyed by studentId)
  const [marksState, setMarksState] = useState<Record<string, string>>({});
  const [remarksState, setRemarksState] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Create Exam Dialog states
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("TEST");
  const [examClassId, setExamClassId] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTotalMarks, setExamTotalMarks] = useState("100");
  const [examPassingMarks, setExamPassingMarks] = useState("40");
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  // Subjects for the Create Exam dialog
  const [dialogSubjects, setDialogSubjects] = useState<{ id: string; name: string }[]>([]);

  // Update dialog subjects list when examClassId changes
  useEffect(() => {
    if (!examClassId) {
      setDialogSubjects([]);
      setExamSubjectId("");
      return;
    }

    const filtered = classSubjects
      .filter((item) => item.classId === examClassId)
      .map((item) => ({ id: item.subjectId, name: item.subjectName }));

    const uniqueMap = new Map<string, string>();
    filtered.forEach((sub) => uniqueMap.set(sub.id, sub.name));
    const unique = Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));

    setDialogSubjects(unique);
    if (unique.length > 0) {
      setExamSubjectId(unique[0].id);
    } else {
      setExamSubjectId("");
    }
  }, [examClassId, classSubjects]);

  // Load class data (students, exams, historical results)
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setExams([]);
      setAllResults([]);
      setSelectedExamId("");
      return;
    }

    const fetchClassDetails = async () => {
      setIsLoadingClassData(true);
      try {
        const res = await fetch(`/api/teacher/grades/${selectedClassId}`);
        if (!res.ok) throw new Error("Failed to load class grade statistics");
        const data = await res.json();
        setStudents(data.students);
        setExams(data.exams);
        setAllResults(data.examResults);
        
        // Auto-select first exam if available
        if (data.exams.length > 0) {
          setSelectedExamId(data.exams[0].id);
        } else {
          setSelectedExamId("");
        }
      } catch (err) {
        console.error(err);
        toast.error("Could not load class information.");
      } finally {
        setIsLoadingClassData(false);
      }
    };

    fetchClassDetails();
  }, [selectedClassId]);

  // Pre-fill input states when selected exam changes
  const activeExam = exams.find((e) => e.id === selectedExamId);

  useEffect(() => {
    if (!selectedExamId || students.length === 0) {
      setMarksState({});
      setRemarksState({});
      return;
    }

    const initialMarks: Record<string, string> = {};
    const initialRemarks: Record<string, string> = {};

    students.forEach((student) => {
      const match = allResults.find(
        (r) => r.examId === selectedExamId && r.studentId === student.id
      );
      initialMarks[student.id] = match ? match.marksObtained.toString() : "";
      initialRemarks[student.id] = match?.remarks || "";
    });

    setMarksState(initialMarks);
    setRemarksState(initialRemarks);
  }, [selectedExamId, students, allResults]);

  // Letter Grade Calculator
  const getLetterGrade = (marks: number, total: number) => {
    if (!total || total <= 0) return "-";
    const pct = (marks / total) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    if (pct >= 40) return "D";
    return "F";
  };

  // Real-time computations
  const getComputedStats = () => {
    if (!activeExam || students.length === 0) return null;

    const total = activeExam.totalMarks;
    const passing = activeExam.passingMarks;

    const numericScores: { name: string; score: number }[] = [];

    students.forEach((student) => {
      const mStr = marksState[student.id];
      if (mStr !== undefined && mStr !== "") {
        const val = parseFloat(mStr);
        if (!isNaN(val)) {
          numericScores.push({ name: student.name, score: val });
        }
      }
    });

    if (numericScores.length === 0) {
      return {
        averagePct: 0,
        highest: { score: 0, studentName: "N/A" },
        lowest: { score: 0, studentName: "N/A" },
        passCount: 0,
        failCount: 0,
        passRate: 0,
      };
    }

    const scoresOnly = numericScores.map((s) => s.score);
    const sum = scoresOnly.reduce((acc, curr) => acc + curr, 0);
    const avgScore = sum / numericScores.length;
    const averagePct = Math.round((avgScore / total) * 100);

    // Highest / Lowest
    const highest = numericScores.reduce((max, curr) => (curr.score > max.score ? curr : max), numericScores[0]);
    const lowest = numericScores.reduce((min, curr) => (curr.score < min.score ? curr : min), numericScores[0]);

    // Pass / Fail counts
    const passCount = scoresOnly.filter((s) => s >= passing).length;
    const failCount = numericScores.length - passCount;
    const passRate = Math.round((passCount / numericScores.length) * 100);

    return {
      averagePct,
      highest: { score: highest.score, studentName: highest.name },
      lowest: { score: lowest.score, studentName: lowest.name },
      passCount,
      failCount,
      passRate,
    };
  };

  const stats = getComputedStats();

  // Save Handlers
  const handleSaveMarks = async () => {
    if (!selectedExamId) return;

    setIsSaving(true);
    const resultsPayload = students
      .map((student) => {
        const marks = marksState[student.id];
        return {
          studentId: student.id,
          marksObtained: marks === "" ? "0" : marks,
          remarks: remarksState[student.id] || "",
        };
      })
      .filter((r) => r.marksObtained !== undefined);

    try {
      const res = await fetch("/api/teacher/grades/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          results: resultsPayload,
        }),
      });

      if (!res.ok) throw new Error("Failed to save student scores");
      const data = await res.json();

      // Update local results store to reflect changes
      const updatedResults = [...allResults];
      resultsPayload.forEach((r) => {
        const idx = updatedResults.findIndex(
          (match) => match.examId === selectedExamId && match.studentId === r.studentId
        );
        if (idx !== -1) {
          updatedResults[idx].marksObtained = parseFloat(r.marksObtained);
          updatedResults[idx].remarks = r.remarks;
        } else {
          updatedResults.push({
            id: `new-${Math.random()}`,
            examId: selectedExamId,
            studentId: r.studentId,
            marksObtained: parseFloat(r.marksObtained),
            remarks: r.remarks,
          });
        }
      });
      setAllResults(updatedResults);

      toast.success(data.message || `Marks saved successfully! Parents alerted.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save grades.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradesExport = async () => {
    if (!activeExam) return;
    const { exportGradesExcel } = await import("@/lib/export/excel-generator");
    const totalMarks = activeExam.totalMarks || 100;
    const mapped = students.map((student) => {
      const obtained = parseFloat(marksState[student.id] || "0") || 0;
      const pctRounded = Math.round((obtained / totalMarks) * 100);
      return {
        studentName: student.name,
        rollNumber: student.rollNumber || "-",
        obtainedMarks: obtained,
        totalMarks: totalMarks,
        percentage: pctRounded,
        grade: getLetterGrade(obtained, totalMarks),
      };
    });
    exportGradesExcel(mapped, activeExam.title);
  };

  // Create Exam Handler
  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examTitle || !examClassId || !examSubjectId || !examDate || !examTotalMarks || !examPassingMarks) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsCreatingExam(true);
    try {
      const res = await fetch("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: examTitle,
          examType,
          classId: examClassId,
          subjectId: examSubjectId,
          examDate,
          totalMarks: examTotalMarks,
          passingMarks: examPassingMarks,
        }),
      });

      if (!res.ok) throw new Error("Could not create exam schedule");
      const newExam = await res.json();

      // If the new exam class matches the current selection, update local exam list
      if (examClassId === selectedClassId) {
        setExams((prev) => [newExam, ...prev]);
        setSelectedExamId(newExam.id);
      }

      toast.success("Exam scheduled successfully!");
      setIsCreateExamOpen(false);

      // Reset fields
      setExamTitle("");
      setExamClassId("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create exam.");
    } finally {
      setIsCreatingExam(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Grades Workbook</h1>
          <p className="text-gray-400 text-sm mt-1">
            Log student exam results, perform evaluations, and report assessments to parents.
          </p>
        </div>

        <button
          onClick={() => setIsCreateExamOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 shrink-0"
        >
          <Plus className="size-4" />
          Create New Exam
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-4 rounded-xl">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            1. Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
          >
            <option value="">Select a class...</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            2. Select Exam
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            disabled={!selectedClassId || exams.length === 0}
            className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!selectedClassId ? (
              <option value="">Select a class first...</option>
            ) : exams.length === 0 ? (
              <option value="">No exams scheduled for this class</option>
            ) : (
              exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.subject?.name}) - {new Date(e.examDate).toLocaleDateString("en-PK")}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Workspace content */}
      {isLoadingClassData ? (
        <Card className="border border-white/[0.06] bg-gray-900/40 p-12 text-center rounded-xl flex items-center justify-center">
          <Loader2 className="size-6 text-purple-500 animate-spin" />
        </Card>
      ) : !selectedClassId ? (
        <Card className="border border-white/[0.06] bg-gray-900/40 p-12 text-center rounded-xl text-gray-500 text-sm">
          <Award className="size-10 text-gray-600 mx-auto mb-3 animate-pulse" />
          Please select a class and an exam from the filter controls to open the marks workbook.
        </Card>
      ) : exams.length === 0 ? (
        <Card className="border border-white/[0.06] bg-gray-900/40 p-12 text-center rounded-xl text-gray-500 text-sm">
          <BookOpen className="size-10 text-gray-600 mx-auto mb-3" />
          No exams scheduled for this class. Schedule an exam first using the "Create New Exam" button.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Marks Entry Sheet */}
          {activeExam && (
            <Card className="border border-white/[0.06] bg-gray-900/40 backdrop-blur-xl rounded-xl overflow-hidden">
              <CardHeader className="border-b border-white/[0.05] flex flex-row items-center justify-between py-4">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Award className="size-4 text-purple-400" />
                  Roster Marks: {activeExam.title} (Max Marks: {activeExam.totalMarks}, Passing: {activeExam.passingMarks})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <ExportButton
                    data={students}
                    type="excel"
                    exportFunction={() => handleGradesExport()}
                    className="h-8 text-xs border-gray-700 bg-gray-900/60 text-gray-250 hover:bg-gray-800"
                  />
                  <button
                    onClick={handleSaveMarks}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 h-8"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save All Marks
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <ResponsiveTable<Student>
              data={students}
              rowIdAccessor={(student) => student.id}
              mobileCardHeader={(student) => (
                <span className="font-bold text-white text-sm">{student.name}</span>
              )}
              mobileCardSubtitle={(student) => (
                <span className="text-gray-500 text-[10px] font-medium">Roll No: {student.rollNumber || "N/A"}</span>
              )}
              columns={[
                {
                  header: "Roll No",
                  hideInMobileCard: true,
                  className: "pl-6 font-semibold text-gray-400",
                  render: (student) => student.rollNumber || "N/A"
                },
                {
                  header: "Student Name",
                  hideInMobileCard: true,
                  className: "font-bold text-white",
                  render: (student) => student.name
                },
                {
                  header: "Marks Obtained",
                  className: "w-36",
                  render: (student) => {
                    const mStr = marksState[student.id] || "";
                    const score = parseFloat(mStr);
                    const isInvalid = mStr !== "" && (isNaN(score) || score < 0 || score > activeExam.totalMarks);
                    const isPassed = !isInvalid && mStr !== "" && score >= activeExam.passingMarks;
                    const isFailed = !isInvalid && mStr !== "" && score < activeExam.passingMarks;

                    return (
                      <input
                        type="number"
                        step="0.5"
                        value={mStr}
                        onChange={(e) =>
                          setMarksState((prev) => ({
                            ...prev,
                            [student.id]: e.target.value,
                          }))
                        }
                        min={0}
                        max={activeExam.totalMarks}
                        placeholder={`0 - ${activeExam.totalMarks}`}
                        inputMode="numeric"
                        className={`w-full bg-black/40 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-0 h-11 sm:h-9 ${
                          isInvalid
                            ? "border border-orange-500"
                            : isFailed
                            ? "border border-red-500/60 bg-red-500/5 text-red-300"
                            : isPassed
                            ? "border border-emerald-500/60 bg-emerald-500/5 text-emerald-300"
                            : "border border-white/[0.08]"
                        }`}
                      />
                    );
                  }
                },
                {
                  header: "Grade",
                  className: "text-center w-24 font-extrabold",
                  render: (student) => {
                    const mStr = marksState[student.id] || "";
                    const score = parseFloat(mStr);
                    const isInvalid = mStr !== "" && (isNaN(score) || score < 0 || score > activeExam.totalMarks);
                    const isFailed = !isInvalid && mStr !== "" && score < activeExam.passingMarks;

                    return mStr !== "" && !isNaN(score) ? (
                      <span
                        className={
                          isFailed
                            ? "text-red-400"
                            : score / activeExam.totalMarks >= 0.8
                            ? "text-emerald-400 animate-pulse"
                            : "text-blue-400"
                        }
                      >
                        {getLetterGrade(score, activeExam.totalMarks)}
                      </span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    );
                  }
                },
                {
                  header: "Remarks",
                  className: "pr-6",
                  render: (student) => (
                    <input
                      type="text"
                      value={remarksState[student.id] || ""}
                      onChange={(e) =>
                        setRemarksState((prev) => ({
                          ...prev,
                          [student.id]: e.target.value,
                        }))
                      }
                      placeholder="Add comments..."
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500/40 h-11 sm:h-9"
                    />
                  )
                }
              ]}
            />
          </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Average & Rate */}
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      Class Average / Pass Rate
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {stats.averagePct}%
                      </span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {stats.passRate}% pass
                      </span>
                    </div>
                  </div>
                  <TrendingUp className="size-8 text-blue-500/50" />
                </CardContent>
              </Card>

              {/* Pass / Fail counts */}
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      Pass / Fail Counts
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-bold text-emerald-400">
                        {stats.passCount} Passed
                      </span>
                      <span className="text-xl font-bold text-red-400">
                        {stats.failCount} Failed
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="size-8 text-emerald-500/50" />
                </CardContent>
              </Card>

              {/* Highest / Lowest scorer */}
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                <CardContent className="p-5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      Highest / Lowest Performers
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 font-medium">Highest: {stats.highest.score}</p>
                        <p className="text-white font-bold truncate max-w-[100px]">{stats.highest.studentName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Lowest: {stats.lowest.score}</p>
                        <p className="text-red-400 font-bold truncate max-w-[100px]">{stats.lowest.studentName}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* CREATE EXAM DIALOG */}
      <Dialog open={isCreateExamOpen} onOpenChange={setIsCreateExamOpen}>
        <DialogContent className="border border-white/[0.1] bg-gray-950 text-white rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-white/[0.06] pb-3">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-1.5">
              <Calendar className="size-4 text-purple-400" />
              Schedule New Exam
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateExamSubmit} className="space-y-4 pt-3">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Exam Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. Chapter 3 Quiz, Midterm Exam"
                className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50"
                required
              />
            </div>

            {/* Exam Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Exam Type
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
              >
                <option value="TEST">Monthly Test</option>
                <option value="QUIZ">Quiz</option>
                <option value="MIDTERM">Midterm</option>
                <option value="FINAL">Final Exam</option>
              </select>
            </div>

            {/* Class & Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={examClassId}
                  onChange={(e) => setExamClassId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  required
                >
                  <option value="">Select class...</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                  disabled={!examClassId}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer disabled:opacity-40"
                  required
                >
                  {!examClassId ? (
                    <option value="">Select class first...</option>
                  ) : (
                    dialogSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Exam Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 [color-scheme:dark] cursor-pointer"
                required
              />
            </div>

            {/* Marks config */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={examTotalMarks}
                  onChange={(e) => setExamTotalMarks(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Passing Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={examPassingMarks}
                  onChange={(e) => setExamPassingMarks(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/[0.06] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateExamOpen(false)}
                className="text-xs font-semibold py-2 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingExam}
                className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-purple-500/10"
              >
                {isCreatingExam && <Loader2 className="size-3.5 animate-spin" />}
                Schedule Exam
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
