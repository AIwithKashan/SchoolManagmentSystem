"use client";

import { EmptyState } from "@/components/shared/EmptyState";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  School,
  Users,
  LayoutGrid,
  Search,
  Plus,
  Sparkles,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  GraduationCap,
  User,
  BookOpen,
  ChevronDown,
  X,
  Bot,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ─── Types ─────────────────────────────────────────────────────────────
interface ClassItem {
  id: string;
  name: string;
  section: string;
  gradeLevel: number;
  displayName: string;
  capacity: number;
  studentCount: number;
  subjectCount: number;
  classTeacher: { id: string; name: string } | null;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  isClassTeacher: boolean;
  classTeacherOf: { id: string; name: string } | null;
}

// ─── Constants ─────────────────────────────────────────────────────────
const GRADE_OPTIONS = [
  { value: 0, label: "Nursery" },
  { value: 1, label: "Prep" },
  { value: 2, label: "Grade 1" },
  { value: 3, label: "Grade 2" },
  { value: 4, label: "Grade 3" },
  { value: 5, label: "Grade 4" },
  { value: 6, label: "Grade 5" },
  { value: 7, label: "Grade 6" },
  { value: 8, label: "Grade 7" },
  { value: 9, label: "Grade 8" },
  { value: 10, label: "Grade 9" },
  { value: 11, label: "Grade 10" },
];

function getGradeBadge(level: number): {
  label: string;
  className: string;
} {
  if (level <= 1) return { label: "Early Years", className: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" };
  if (level <= 6) return { label: "Primary", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  if (level <= 9) return { label: "Middle", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
  return { label: "Secondary", className: "bg-red-500/15 text-red-300 border-red-500/30" };
}

// ─── Zod schema ─────────────────────────────────────────────────────────
const classSchema = z.object({
  gradeLevel: z.coerce.number().min(0),
  section: z.string().min(1, "Section is required").max(5),
  capacity: z.coerce.number().min(1).max(200).default(30),
  classTeacherId: z.string().optional(),
});
type ClassForm = {
  gradeLevel: number;
  section: string;
  capacity: number;
  classTeacherId?: string;
};

// ─── AI Grade range parser (re-used from settings) ─────────────────────
const ALL_GRADES_LIST = [
  "nursery", "prep",
  "grade 1","grade 2","grade 3","grade 4","grade 5",
  "grade 6","grade 7","grade 8","grade 9","grade 10",
];

function parseAIClassPrompt(msg: string): { grades: string[]; sections: string[] } {
  const lower = msg.toLowerCase();
  const grades: string[] = [];

  // Range detection
  const rangeMatch = lower.match(/(nursery|prep|grade \d+)\s+to\s+(nursery|prep|grade \d+)/);
  if (rangeMatch) {
    const si = ALL_GRADES_LIST.indexOf(rangeMatch[1]);
    const ei = ALL_GRADES_LIST.indexOf(rangeMatch[2]);
    if (si >= 0 && ei >= si) {
      for (let i = si; i <= ei; i++) grades.push(ALL_GRADES_LIST[i]);
    }
  } else {
    for (const g of [...ALL_GRADES_LIST].reverse()) {
      if (lower.includes(g)) grades.push(g);
    }
  }

  const sections: string[] = [];
  const andMatch = lower.match(/\b([a-e])\s+and\s+([a-e])\b/);
  const countMatch = lower.match(/(\d+)\s+section/);
  const letterListMatch = msg.match(/\b([A-E])(?:[,\s]+[A-E])+/g);

  if (andMatch) {
    sections.push(andMatch[1].toUpperCase(), andMatch[2].toUpperCase());
  } else if (letterListMatch) {
    letterListMatch[0].split(/[,\s]+/).filter(Boolean).forEach((l) => sections.push(l.toUpperCase()));
  } else if (countMatch) {
    const n = Math.min(parseInt(countMatch[1]), 5);
    for (let i = 0; i < n; i++) sections.push(String.fromCharCode(65 + i));
  }

  if (sections.length === 0) sections.push("A");
  if (grades.length === 0) grades.push(...ALL_GRADES_LIST);

  return { grades, sections };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgSize, setAvgSize] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load data
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/principal/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes ?? []);
        setTotalStudents(data.totalStudents ?? 0);
        setAvgSize(data.avgSize ?? 0);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/principal/teachers/list");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.data?.teachers ?? data.teachers ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, [loadClasses, loadTeachers]);

  // Filtered classes
  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        !search ||
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        c.classTeacher?.name.toLowerCase().includes(search.toLowerCase());
      const matchGrade =
        gradeFilter === "all" || c.gradeLevel === parseInt(gradeFilter);
      const matchSection =
        sectionFilter === "all" || c.section === sectionFilter;
      return matchSearch && matchGrade && matchSection;
    });
  }, [classes, search, gradeFilter, sectionFilter]);

  // Unique sections for filter
  const uniqueSections = useMemo(
    () => Array.from(new Set(classes.map((c) => c.section))).sort(),
    [classes]
  );

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/principal/classes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`${deleteTarget.displayName} deleted successfully`);
        setDeleteTarget(null);
        await loadClasses();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to delete class");
      }
    } catch {
      toast.error("Network error");
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Classes &amp; Sections
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage all classes and sections in your school
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setAiOpen(true)}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 shadow-none h-9 text-sm"
          >
            <Bot className="size-4 mr-1.5" />
            AI Create
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus className="size-4 mr-1.5" />
            Add Class
          </Button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Classes",
            value: classes.length,
            icon: School,
            color: "text-blue-400",
            border: "border-blue-500/20",
            bg: "bg-blue-500/5",
          },
          {
            label: "Total Students",
            value: totalStudents,
            icon: Users,
            color: "text-emerald-400",
            border: "border-emerald-500/20",
            bg: "bg-emerald-500/5",
          },
          {
            label: "Avg Class Size",
            value: avgSize,
            icon: LayoutGrid,
            color: "text-purple-400",
            border: "border-purple-500/20",
            bg: "bg-purple-500/5",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`border ${stat.border} bg-gray-900/60 backdrop-blur-xl rounded-xl`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`size-9 rounded-lg border ${stat.border} ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{loading ? "–" : stat.value}</p>
                  <p className="text-[11px] text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes or teachers..."
            className="pl-9 bg-gray-900/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Grade Filter */}
        <div className="relative">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[140px]"
          >
            <option value="all">All Grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
        </div>

        {/* Section Filter */}
        <div className="relative">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[130px]"
          >
            <option value="all">All Sections</option>
            {uniqueSections.map((s) => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* ── Classes Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="w-full">
          <EmptyState
            icon={BookOpen}
            title={classes.length === 0 ? "No Classes Created" : "No Classes Found"}
            description={classes.length === 0 ? "Use AI to create all your classes instantly" : "Try adjusting your search or filters."}
            actionLabel={classes.length === 0 ? "Create with AI" : null}
            onAction={classes.length === 0 ? () => setAiOpen(true) : null}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onEdit={() => setEditTarget(cls)}
              onDelete={() => setDeleteTarget(cls)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && filtered.length > 0 && (
        <p className="text-[11px] text-gray-600 text-center">
          Showing {filtered.length} of {classes.length} class{classes.length !== 1 ? "es" : ""}
        </p>
      )}

      {/* ── Dialogs ── */}
      <AddEditClassDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        teachers={teachers}
        onSuccess={async () => { setAddOpen(false); await loadClasses(); }}
      />

      {editTarget && (
        <AddEditClassDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          teachers={teachers}
          editData={editTarget}
          onSuccess={async () => { setEditTarget(null); await loadClasses(); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-400" />
              Delete Class
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <span className="text-white font-semibold">{deleteTarget?.displayName}</span>?
              {(deleteTarget?.studentCount ?? 0) > 0 && (
                <span className="block mt-1 text-red-400 text-xs">
                  ⚠️ This class has {deleteTarget?.studentCount} student{deleteTarget?.studentCount !== 1 ? "s" : ""} enrolled and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || (deleteTarget?.studentCount ?? 0) > 0}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AICreateDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSuccess={async () => { setAiOpen(false); await loadClasses(); }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLASS CARD
// ═══════════════════════════════════════════════════════════════════════
function ClassCard({
  cls,
  onEdit,
  onDelete,
}: {
  cls: ClassItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = getGradeBadge(cls.gradeLevel);
  const fillPct = cls.capacity > 0
    ? Math.min(Math.round((cls.studentCount / cls.capacity) * 100), 100)
    : 0;

  return (
    <Card className="group border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl hover:border-white/[0.12] transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5">
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-none">
              {cls.displayName}
            </h3>
            <span
              className={cn(
                "inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
          {/* Section circle */}
          <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <span className="text-base font-bold text-purple-300">{cls.section}</span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              {cls.classTeacher ? cls.classTeacher.name : (
                <span className="text-gray-600 italic">No class teacher assigned</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">{cls.studentCount} students</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">{cls.subjectCount} subjects</span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>Capacity</span>
            <span>{cls.studentCount}/{cls.capacity}</span>
          </div>
          <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                fillPct > 90 ? "bg-red-500" : fillPct > 70 ? "bg-yellow-500" : "bg-emerald-500"
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            href={`/principal/classes/${cls.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium transition-all"
          >
            <Eye className="size-3.5" />
            View
          </Link>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 text-xs font-medium transition-all"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 h-8 w-10 rounded-lg bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-xs transition-all"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ADD / EDIT DIALOG
// ═══════════════════════════════════════════════════════════════════════
function AddEditClassDialog({
  open,
  onClose,
  teachers,
  editData,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  teachers: Teacher[];
  editData?: ClassItem | null;
  onSuccess: () => void;
}) {
  const isEdit = !!editData;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClassForm>({
    resolver: zodResolver(classSchema) as never,
    defaultValues: {
      gradeLevel: editData?.gradeLevel ?? 0,
      section: editData?.section ?? "",
      capacity: editData?.capacity ?? 30,
      classTeacherId: editData?.classTeacher?.id ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        gradeLevel: editData?.gradeLevel ?? 0,
        section: editData?.section ?? "",
        capacity: editData?.capacity ?? 30,
        classTeacherId: editData?.classTeacher?.id ?? "",
      });
    }
  }, [open, editData, reset]);

  const gradeLevel = watch("gradeLevel");
  const section = watch("section");
  const gradeName = GRADE_OPTIONS.find((g) => g.value === Number(gradeLevel))?.label ?? "";
  const autoName = gradeName && section ? `${gradeName} - ${section.toUpperCase()}` : "";

  const onSubmit = async (data: ClassForm) => {
    setSaving(true);
    try {
      const url = isEdit
        ? `/api/principal/classes/${editData!.id}`
        : "/api/principal/classes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          classTeacherId: data.classTeacherId || undefined,
        }),
      });

      if (res.ok) {
        toast.success(isEdit ? "Class updated!" : "Class created!");
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save class");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border border-white/[0.08] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="size-4 text-blue-400" />
            {isEdit ? "Edit Class" : "Add New Class"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Grade Level */}
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block">Grade Level *</Label>
            <div className="relative">
              <select
                {...register("gradeLevel")}
                className="w-full appearance-none bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
            </div>
            {errors.gradeLevel && (
              <p className="text-[11px] text-red-400 mt-1">{errors.gradeLevel.message}</p>
            )}
          </div>

          {/* Section */}
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block">Section *</Label>
            <Input
              {...register("section")}
              placeholder="e.g. A"
              maxLength={5}
              className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 uppercase h-10"
            />
            {errors.section && (
              <p className="text-[11px] text-red-400 mt-1">{errors.section.message}</p>
            )}
          </div>

          {/* Auto-generated name preview */}
          {autoName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Sparkles className="size-3.5 text-blue-400 shrink-0" />
              <span className="text-xs text-blue-300">
                Will be created as: <strong>{autoName}</strong>
              </span>
            </div>
          )}

          {/* Capacity */}
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block">Capacity</Label>
            <Input
              {...register("capacity")}
              type="number"
              min={1}
              max={200}
              placeholder="30"
              className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
            />
          </div>

          {/* Class Teacher */}
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block">Class Teacher (optional)</Label>
            <div className="relative">
              <select
                {...register("classTeacherId")}
                className="w-full appearance-none bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Not Assigned</option>
                {teachers.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.isClassTeacher && t.classTeacherOf?.id !== editData?.id}
                  >
                    {t.name}
                    {t.isClassTeacher && t.classTeacherOf?.id !== editData?.id
                      ? ` (assigned to ${t.classTeacherOf?.name})`
                      : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {isEdit ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AI CREATE DIALOG
// ═══════════════════════════════════════════════════════════════════════
function AICreateDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: string[];
    skipped: string[];
    totalCreated: number;
    totalSkipped: number;
  } | null>(null);

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);

    const { grades, sections } = parseAIClassPrompt(prompt);

    try {
      const res = await fetch("/api/principal/setup/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades, sections }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.totalCreated > 0) {
          toast.success(`Created ${data.totalCreated} classes!`);
        }
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create classes");
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setPrompt("");
    setResult(null);
    onClose();
  };

  const handleDone = async () => {
    setPrompt("");
    setResult(null);
    await onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-gray-900 border border-purple-500/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="size-3.5 text-white" />
            </div>
            AI Create Classes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!result ? (
            <>
              {/* Example prompt */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                <p className="text-xs text-gray-400 mb-2 font-medium">Example prompts:</p>
                <div className="space-y-1.5">
                  {[
                    "Create sections A and B from Nursery to Grade 10",
                    "Add Grade 1, Grade 2, Grade 3 with sections A B C",
                    "Create Nursery, Prep and Grade 1 to Grade 5 with A and B",
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      className="w-full text-left text-[11px] text-purple-300 hover:text-purple-200 p-1.5 rounded-lg hover:bg-purple-500/10 transition-all flex items-center gap-1.5"
                    >
                      <ChevronDown className="size-3 rotate-[-90deg] shrink-0" />
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">
                  Describe the classes to create
                </Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create sections A and B from Nursery to Grade 10"
                  rows={3}
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none"
                />
              </div>
            </>
          ) : (
            /* Results */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="size-4" />
                <span className="text-sm font-semibold">
                  Created {result.totalCreated} class{result.totalCreated !== 1 ? "es" : ""}!
                </span>
              </div>

              {result.created.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl bg-gray-800/40 border border-white/[0.05] p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {result.created.map((name) => (
                      <span
                        key={name}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.totalSkipped > 0 && (
                <p className="text-xs text-yellow-400">
                  ⚠️ {result.totalSkipped} class{result.totalSkipped !== 1 ? "es" : ""} already existed and were skipped.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {result ? (
            <Button
              onClick={handleDone}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={loading || !prompt.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              {loading ? "Creating..." : "Create Classes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
