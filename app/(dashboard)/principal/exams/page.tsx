"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Plus,
  Search,
  ChevronDown,
  Loader2,
  Trash2,
  Pencil,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Users,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface ExamItem {
  id: string;
  title: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  examType: "MIDTERM" | "FINAL" | "QUIZ" | "TEST";
  gradedStudentsCount: number;
}

interface ExamDetails {
  id: string;
  title: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  examType: string;
  className: string;
  subjectName: string;
}

interface StudentResultItem {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string | null;
  marksObtained: number;
  grade: string | null;
  remarks: string | null;
  isPassed: boolean;
}

interface ScoreStats {
  totalGraded: number;
  classAverage: number;
  passRate: number;
  failedCount: number;
}

interface ExamsStats {
  totalScheduled: number;
  gradedResultsCount: number;
  avgPassRate: number;
}

// ─── Constants ─────────────────────────────────────────────────────────
const EXAM_TYPES = [
  { value: "MIDTERM", label: "Midterm Exam" },
  { value: "FINAL", label: "Final Exam" },
  { value: "QUIZ", label: "Quiz" },
  { value: "TEST", label: "Class Test" },
];

const TYPE_COLORS: Record<string, string> = {
  MIDTERM: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  FINAL: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  QUIZ: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  TEST: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

export default function ExaminationsPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [stats, setStats] = useState<ExamsStats>({
    totalScheduled: 0,
    gradedResultsCount: 0,
    avgPassRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Dialog controllers
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Selected targets
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  // Detailed scores modal data
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResultItem[]>([]);
  const [scoreStats, setScoreStats] = useState<ScoreStats>({
    totalGraded: 0,
    classAverage: 0,
    passRate: 0,
    failedCount: 0,
  });
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formExamDate, setFormExamDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formTotalMarks, setFormTotalMarks] = useState("100");
  const [formPassingMarks, setFormPassingMarks] = useState("40");
  const [formExamType, setFormExamType] = useState<"MIDTERM" | "FINAL" | "QUIZ" | "TEST">("MIDTERM");
  const [submittingForm, setSubmittingForm] = useState(false);

  // ─── API: Fetch Initial Data ────────────────────────────────────────
  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        classId: classFilter,
        type: typeFilter,
      });
      const res = await fetch(`/api/principal/exams?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load exams");

      setExams(data.exams);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      toast.error(err.message || "Error retrieving exams");
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, typeFilter]);

  const fetchClassesAndSubjects = async () => {
    try {
      const [classRes, subjectRes] = await Promise.all([
        fetch("/api/principal/classes"),
        fetch("/api/principal/subjects"),
      ]);
      const classData = await classRes.json();
      const subjectData = await subjectRes.json();

      if (classRes.ok && classData.classes) setClasses(classData.classes);
      if (subjectRes.ok && subjectData.subjects) setSubjects(subjectData.subjects);
    } catch (err) {
      console.error("Classes/subjects fetch error:", err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  // ─── API: Create Exam ───────────────────────────────────────────────
  const handleOpenSchedule = () => {
    setFormTitle("");
    setFormClassId(classes[0]?.id || "");
    setFormSubjectId(subjects[0]?.id || "");
    setFormExamDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormTotalMarks("100");
    setFormPassingMarks("40");
    setFormExamType("MIDTERM");
    setOpenScheduleDialog(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formClassId || !formSubjectId || !formExamDate || !formStartTime || !formEndTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmittingForm(true);
      const res = await fetch("/api/principal/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          classId: formClassId,
          subjectId: formSubjectId,
          examDate: formExamDate,
          startTime: formStartTime,
          endTime: formEndTime,
          totalMarks: parseFloat(formTotalMarks),
          passingMarks: parseFloat(formPassingMarks),
          examType: formExamType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule exam");

      toast.success("Exam scheduled successfully");
      setOpenScheduleDialog(false);
      fetchExams();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule exam");
    } finally {
      setSubmittingForm(false);
    }
  };

  // ─── API: Edit Exam ─────────────────────────────────────────────────
  const handleOpenEdit = (item: ExamItem) => {
    setSelectedExam(item);
    setFormTitle(item.title);
    setFormClassId(item.classId);
    setFormSubjectId(item.subjectId);
    setFormExamDate(item.examDate.substring(0, 10));
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormTotalMarks(item.totalMarks.toString());
    setFormPassingMarks(item.passingMarks.toString());
    setFormExamType(item.examType);
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    try {
      setSubmittingForm(true);
      const res = await fetch(`/api/principal/exams/${selectedExam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          examDate: formExamDate,
          startTime: formStartTime,
          endTime: formEndTime,
          totalMarks: parseFloat(formTotalMarks),
          passingMarks: parseFloat(formPassingMarks),
          examType: formExamType,
          subjectId: formSubjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update exam");

      toast.success("Exam schedule updated");
      setOpenEditDialog(false);
      setSelectedExam(null);
      fetchExams();
    } catch (err: any) {
      toast.error(err.message || "Failed to update exam");
    } finally {
      setSubmittingForm(false);
    }
  };

  // ─── API: View Detailed Results ─────────────────────────────────────
  const handleOpenDetails = async (item: ExamItem) => {
    try {
      setDetailsLoading(true);
      setOpenDetailsDialog(true);
      const res = await fetch(`/api/principal/exams/${item.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch exam results");

      setExamDetails(data.exam);
      setStudentResults(data.results);
      setScoreStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to load score report");
      setOpenDetailsDialog(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ─── API: Delete Exam ───────────────────────────────────────────────
  const handleOpenDelete = (id: string) => {
    setExamToDelete(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteSubmit = async () => {
    if (!examToDelete) return;
    try {
      const res = await fetch(`/api/principal/exams/${examToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete exam");
      }

      toast.success("Exam schedule cancelled successfully");
      fetchExams();
    } catch (err: any) {
      toast.error(err.message || "Could not cancel exam");
    } finally {
      setOpenDeleteDialog(false);
      setExamToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="size-8 text-indigo-400" />
            Examinations Registry
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Schedule exams, configure target marks, and view class-level score profiles.
          </p>
        </div>
        <Button
          onClick={handleOpenSchedule}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
        >
          <Plus className="size-4" />
          Schedule Exam
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Scheduled Exams</span>
              <p className="text-2xl font-bold text-white">{stats.totalScheduled}</p>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="size-5 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Graded Registry Entries</span>
              <p className="text-2xl font-bold text-emerald-400">{stats.gradedResultsCount}</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Award className="size-5 text-emerald-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg School Pass Rate</span>
              <p className="text-2xl font-bold text-blue-400">{stats.avgPassRate.toFixed(1)}%</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CheckCircle className="size-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filter Ribbon */}
      <div className="glass-card border-gray-800 p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams by title..."
            className="pl-9 bg-slate-950/60 border-gray-800 text-gray-100 placeholder:text-gray-500 h-10"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3">
          {/* Class Filter */}
          <div className="relative w-full sm:w-44">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.displayName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 size-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Exam Type Filter */}
          <div className="relative w-full sm:w-44">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Exam Types</option>
              <option value="MIDTERM">Midterm Exam</option>
              <option value="FINAL">Final Exam</option>
              <option value="QUIZ">Quiz</option>
              <option value="TEST">Class Test</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 size-4 text-gray-500 pointer-events-none" />
          </div>

          {(search || classFilter !== "all" || typeFilter !== "all") && (
            <Button
              onClick={() => {
                setSearch("");
                setClassFilter("all");
                setTypeFilter("all");
              }}
              variant="outline"
              className="border-gray-850 hover:bg-slate-800 text-gray-400 hover:text-white h-10 text-xs px-3"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 text-indigo-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium font-mono">Parsing scheduled tests database...</span>
        </div>
      ) : exams.length === 0 ? (
        <Card className="glass-card border-gray-800 bg-slate-900/20 py-20 text-center flex flex-col items-center justify-center">
          <BookOpen className="size-12 text-gray-700 mb-2" />
          <h3 className="text-lg font-bold text-white">No Exams Scheduled</h3>
          <p className="text-gray-500 text-sm max-w-sm mt-1">
            No exams match your current search and filter preferences. Click &quot;Schedule Exam&quot; to begin.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((item) => (
            <Card
              key={item.id}
              className="glass-card border-gray-800/80 bg-slate-900/30 flex flex-col justify-between overflow-hidden shadow-md group hover:border-indigo-500/40 transition duration-200"
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border", TYPE_COLORS[item.examType])}>
                    {item.examType}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                    <Clock className="size-3" />
                    {item.startTime} - {item.endTime}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                    <BookOpen className="size-3.5 text-indigo-400" />
                    <span>{item.subjectName}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-300 font-bold">{item.className}</span>
                  </div>
                </div>

                {/* Scope & Pass Limit */}
                <div className="p-3 rounded-lg bg-slate-950/40 border border-gray-850 flex justify-between text-xs text-gray-400">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-semibold">Total Marks</span>
                    <span className="font-bold text-white text-sm">{item.totalMarks}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 uppercase block font-semibold">Passing Limit</span>
                    <span className="font-bold text-amber-400 text-sm">{item.passingMarks}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar footer */}
              <div className="px-5 py-3 bg-slate-950/40 border-t border-gray-800/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {item.gradedStudentsCount > 0 ? (
                    <span className="text-emerald-400">Graded ({item.gradedStudentsCount})</span>
                  ) : (
                    <span className="text-amber-400">Scheduled</span>
                  )}
                </span>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenDetails(item)}
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20"
                    title="View Grade Report"
                  >
                    <BarChart3 className="size-3.5" />
                  </Button>

                  <Button
                    onClick={() => handleOpenEdit(item)}
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-white border border-yellow-500/20"
                    title="Edit Exam"
                  >
                    <Pencil className="size-3.5" />
                  </Button>

                  <Button
                    onClick={() => handleOpenDelete(item.id)}
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"
                    title="Cancel Exam"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Dialog: Schedule Exam ───────────────────────────────────────── */}
      <Dialog open={openScheduleDialog} onOpenChange={setOpenScheduleDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="size-5 text-indigo-400" />
              Schedule New Exam
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exam-title" className="text-xs font-semibold text-gray-400">Exam Title</Label>
              <Input
                id="exam-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. First Term Mathematics Evaluation"
                className="bg-slate-950 text-white border-gray-850 focus-visible:ring-indigo-600 text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exam-class" className="text-xs font-semibold text-gray-400">Target Class</Label>
                <select
                  id="exam-class"
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-850 rounded-md px-3 py-2 text-xs text-gray-200 outline-none h-9 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-subject" className="text-xs font-semibold text-gray-400">Subject</Label>
                <select
                  id="exam-subject"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-850 rounded-md px-3 py-2 text-xs text-gray-200 outline-none h-9 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="exam-type" className="text-xs font-semibold text-gray-400">Exam Type</Label>
                <select
                  id="exam-type"
                  value={formExamType}
                  onChange={(e) => setFormExamType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-gray-850 rounded-md px-3 py-2 text-xs text-gray-200 outline-none h-9 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="MIDTERM">Midterm</option>
                  <option value="FINAL">Final</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="TEST">Class Test</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-total" className="text-xs font-semibold text-gray-400">Total Marks</Label>
                <Input
                  id="exam-total"
                  type="number"
                  value={formTotalMarks}
                  onChange={(e) => setFormTotalMarks(e.target.value)}
                  className="bg-slate-950 text-white border-gray-850 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-pass" className="text-xs font-semibold text-gray-400">Passing Limit</Label>
                <Input
                  id="exam-pass"
                  type="number"
                  value={formPassingMarks}
                  onChange={(e) => setFormPassingMarks(e.target.value)}
                  className="bg-slate-950 text-white border-gray-850 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exam-date" className="text-xs font-semibold text-gray-400">Exam Date</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={formExamDate}
                  onChange={(e) => setFormExamDate(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-start" className="text-xs font-semibold text-gray-400">Start Time</Label>
                <Input
                  id="exam-start"
                  type="text"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-end" className="text-xs font-semibold text-gray-400">End Time</Label>
                <Input
                  id="exam-end"
                  type="text"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => setOpenScheduleDialog(false)}
                variant="outline"
                className="border-gray-850 text-gray-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingForm}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {submittingForm ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Edit Exam Details ────────────────────────────────────── */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="bg-slate-900 border border-gray-850 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="size-5 text-yellow-450" />
              Edit Exam Schedule
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-semibold text-gray-400">Exam Title</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-slate-950 text-white border-gray-850 focus-visible:ring-indigo-600 text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-subject" className="text-xs font-semibold text-gray-400">Subject</Label>
                <select
                  id="edit-subject"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-850 rounded-md px-3 py-2 text-xs text-gray-200 outline-none h-9 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="edit-type" className="text-xs font-semibold text-gray-400">Exam Type</Label>
                <select
                  id="edit-type"
                  value={formExamType}
                  onChange={(e) => setFormExamType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-gray-855 rounded-md px-3 py-2 text-xs text-gray-200 outline-none h-9 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="MIDTERM">Midterm</option>
                  <option value="FINAL">Final</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="TEST">Class Test</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-total" className="text-xs font-semibold text-gray-400">Total Marks</Label>
                <Input
                  id="edit-total"
                  type="number"
                  value={formTotalMarks}
                  onChange={(e) => setFormTotalMarks(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-pass" className="text-xs font-semibold text-gray-400">Passing Limit</Label>
                <Input
                  id="edit-pass"
                  type="number"
                  value={formPassingMarks}
                  onChange={(e) => setFormPassingMarks(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-date" className="text-xs font-semibold text-gray-400">Exam Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formExamDate}
                  onChange={(e) => setFormExamDate(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-start" className="text-xs font-semibold text-gray-400">Start Time</Label>
                <Input
                  id="edit-start"
                  type="text"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end" className="text-xs font-semibold text-gray-400">End Time</Label>
                <Input
                  id="edit-end"
                  type="text"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="bg-slate-950 text-white border-gray-855 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  setOpenEditDialog(false);
                  setSelectedExam(null);
                }}
                variant="outline"
                className="border-gray-855 text-gray-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingForm}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium animate-none"
              >
                {submittingForm ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Exam Detailed Scores Profile ────────────────────────── */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-lg p-0 overflow-hidden">
          {detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-gray-400 font-medium font-mono">Compiling score profiles...</span>
            </div>
          ) : examDetails ? (
            <div>
              {/* Detailed panel */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{examDetails.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Class: <span className="font-semibold text-gray-200">{examDetails.className}</span> | Subject: <span className="font-semibold text-indigo-400">{examDetails.subjectName}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold bg-slate-950/60 px-2.5 py-1 rounded border border-gray-800">
                    Max: {examDetails.totalMarks} | Pass: {examDetails.passingMarks}
                  </span>
                </div>

                {/* Score Stats Summary Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/50 border border-gray-850 rounded-lg text-center">
                    <span className="text-[9px] text-gray-500 block uppercase font-semibold">Total Graded</span>
                    <span className="text-lg font-extrabold text-white">{scoreStats.totalGraded}</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 border border-gray-850 rounded-lg text-center">
                    <span className="text-[9px] text-gray-500 block uppercase font-semibold">Class Avg</span>
                    <span className="text-lg font-extrabold text-blue-400">{scoreStats.classAverage.toFixed(1)}</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 border border-gray-850 rounded-lg text-center">
                    <span className="text-[9px] text-gray-500 block uppercase font-semibold">Pass Rate</span>
                    <span className="text-lg font-extrabold text-emerald-400">{scoreStats.passRate.toFixed(0)}%</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 border border-gray-850 rounded-lg text-center">
                    <span className="text-[9px] text-gray-500 block uppercase font-semibold">Failed Count</span>
                    <span className="text-lg font-extrabold text-red-400">{scoreStats.failedCount}</span>
                  </div>
                </div>

                {/* Student Score Breakdown List */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Student Results Ledger</Label>
                  {studentResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 bg-slate-950/30 border border-gray-850 rounded-lg">
                      No results have been uploaded/graded for this exam yet.
                    </div>
                  ) : (
                    <div className="border border-gray-850 rounded-lg overflow-hidden divide-y divide-gray-850 text-xs">
                      <div className="grid grid-cols-4 bg-slate-950/60 p-2 font-semibold text-gray-400">
                        <span className="col-span-2">Student Name</span>
                        <span className="text-center">Score</span>
                        <span className="text-right">Remarks</span>
                      </div>
                      {studentResults.map((r) => (
                        <div key={r.id} className="grid grid-cols-4 p-2.5 items-center hover:bg-slate-800/10">
                          <span className="font-medium text-gray-200 col-span-2 truncate" title={r.studentName}>
                            {r.studentName}
                          </span>
                          <span className={cn("text-center font-bold", r.isPassed ? "text-emerald-400" : "text-red-400")}>
                            {r.marksObtained}
                          </span>
                          <span className="text-right text-[10px] text-gray-500 truncate" title={r.remarks ?? ""}>
                            {r.remarks || r.grade || "Passed"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="p-4 bg-slate-950 border-t border-gray-850/80 flex justify-end">
                <Button
                  onClick={() => {
                    setOpenDetailsDialog(false);
                    setExamDetails(null);
                    setStudentResults([]);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
                >
                  Close Report
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Delete Confirmation ─────────────────────────────────── */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border border-gray-800 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-white">
              Cancel Scheduled Exam?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-xs mt-1.5 leading-relaxed">
              Are you sure you want to cancel and delete this scheduled exam? This will remove the exam schedule and delete all graded result details associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => {
                setOpenDeleteDialog(false);
                setExamToDelete(null);
              }}
              className="border-gray-800 text-gray-400 hover:bg-slate-800 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold border-none animate-none"
            >
              Cancel Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
