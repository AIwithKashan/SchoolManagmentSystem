"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  TrendingUp,
  UserX,
  AlertTriangle,
  Search,
  Plus,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  X,
  CheckSquare,
  Square,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { EmptyState, ExportButton } from "@/components/shared";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { StudentTableSkeleton } from "@/components/shared/skeletons";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  gender: string;
  isActive: boolean;
  photo: string | null;
  class: {
    id: string;
    name: string;
    section: string;
  } | null;
  admissionDate: string;
  parent: {
    name: string;
    phone: string | null;
  } | null;
  attendancePct: number | null;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    active: 0,
    thisMonth: 0,
    lowAttendance: 0,
    noClass: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Sort State
  const [sortField, setSortField] = useState<keyof Student | "class.name">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dialog / Action States
  const [importOpen, setImportOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Student | null>(null);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkClassOpen, setBulkClassOpen] = useState(false);
  const [selectedTargetClass, setSelectedTargetClass] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleExport = async (dataToExport: Student[], format: "pdf" | "excel") => {
    if (format === "pdf") {
      const { exportStudentsPDF } = await import("@/lib/export/pdf-generator");
      const mapped = dataToExport.map((s) => ({
        name: s.name,
        class: s.class ? `${s.class.name}-${s.class.section}` : "-",
        rollNumber: s.rollNumber || "-",
        admissionNumber: s.admissionNumber,
        attendancePct: s.attendancePct !== null ? String(s.attendancePct) : "-",
      }));
      exportStudentsPDF(mapped, { name: "EduMind AI Academy", city: "Main" });
    } else {
      const { exportStudentsExcel } = await import("@/lib/export/excel-generator");
      const mapped = dataToExport.map((s) => ({
        name: s.name,
        class: s.class ? s.class.name : "-",
        section: s.class ? s.class.section : "-",
        rollNumber: s.rollNumber || "-",
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        dateOfBirth: s.admissionDate || "-",
        parentName: s.parent?.name || "-",
        parentPhone: s.parent?.phone || "-",
        attendancePct: s.attendancePct ?? 0,
      }));
      exportStudentsExcel(mapped);
    }
  };

  // Fetch list
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        classId: classFilter,
        gender: genderFilter,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/principal/students?${query}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      toast.error("Failed to load students data");
    }
    setLoading(false);
  }, [search, classFilter, genderFilter, statusFilter, page, limit]);

  // Fetch classes for filtering
  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/principal/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, classFilter, genderFilter, statusFilter, limit]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Sorting
  const handleSort = (field: keyof Student | "class.name") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let valA: any = a[sortField as keyof Student];
      let valB: any = b[sortField as keyof Student];

      if (sortField === "class.name") {
        valA = a.class ? `${a.class.name} ${a.class.section}` : "";
        valB = b.class ? `${b.class.name} ${b.class.section}` : "";
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [students, sortField, sortOrder]);

  // Deactivate handler (Soft delete single)
  const handleDeactivateSingle = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/principal/students/${deactivateTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Student ${deactivateTarget.name} deactivated successfully`);
        setDeactivateTarget(null);
        await loadStudents();
      } else {
        toast.error("Failed to deactivate student");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(false);
  };

  // Bulk Deactivate (Soft delete selected)
  const handleBulkDeactivate = async () => {
    setActionLoading(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/principal/students/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      toast.success(`Deactivated ${successCount} student(s) successfully`);
      setSelectedIds([]);
      setBulkDeactivateOpen(false);
      await loadStudents();
    } catch {
      toast.error("An error occurred during bulk deactivation");
    }
    setActionLoading(false);
  };

  // Bulk Move to Class
  const handleBulkMoveClass = async () => {
    if (!selectedTargetClass) {
      toast.error("Please select a target class");
      return;
    }
    setActionLoading(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/principal/students/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: selectedTargetClass }),
        });
        if (res.ok) successCount++;
      }
      toast.success(`Moved ${successCount} student(s) to new class`);
      setSelectedIds([]);
      setBulkClassOpen(false);
      setSelectedTargetClass("");
      await loadStudents();
    } catch {
      toast.error("Network error during moving class");
    }
    setActionLoading(false);
  };

  // Export selected to JSON / CSV download
  const handleBulkExport = () => {
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    if (selectedStudents.length === 0) return;

    // Build CSV Content
    const headers = [
      "Name",
      "Admission Number",
      "Roll Number",
      "Class",
      "Gender",
      "Parent Name",
      "Parent Contact",
      "Attendance %",
      "Status",
    ];
    const rows = selectedStudents.map((s) => [
      s.name,
      s.admissionNumber,
      s.rollNumber || "-",
      s.class ? `${s.class.name}-${s.class.section}` : "-",
      s.gender,
      s.parent?.name || "-",
      s.parent?.phone || "-",
      s.attendancePct !== null ? `${s.attendancePct}%` : "-",
      s.isActive ? "Active" : "Inactive",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedStudents.length} student(s) as CSV!`);
  };

  // Handle CSV file upload & parsing
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim().length > 0);
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

      const parsed = lines.slice(1).map((line) => {
        const columns = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          name: columns[0] || "",
          dateOfBirth: columns[1] || "2015-01-01",
          gender: columns[2] || "Male",
          admissionNumber: columns[3] || `ADM-${Date.now().toString().slice(-4)}`,
          rollNumber: columns[4] || null,
          classId: classes[0]?.id || "", // Default to first class
        };
      });
      setImportPreview(parsed.slice(0, 5)); // show preview of first 5
    };
    reader.readAsText(file);
  };

  // Perform bulk import of students parsed from CSV
  const handlePerformImport = async () => {
    if (!csvFile || importPreview.length === 0) return;
    setImporting(true);
    
    // Simulate/execute import sequence
    let count = 0;
    try {
      // Loop import preview data
      for (const studentData of importPreview) {
        const res = await fetch("/api/principal/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...studentData,
            bloodGroup: "O+",
          }),
        });
        if (res.ok) count++;
      }
      toast.success(`Successfully imported ${count} students!`);
      setImportOpen(false);
      setCsvFile(null);
      setImportPreview([]);
      await loadStudents();
    } catch {
      toast.error("Error occurred while uploading CSV rows");
    }
    setImporting(false);
  };

  // Helpers for styling
  const getAttendanceBadge = (pct: number | null) => {
    if (pct === null) return "text-gray-500 bg-gray-500/5 border-gray-500/10";
    if (pct >= 85) return "text-emerald-400 bg-emerald-500/5 border-emerald-500/20";
    if (pct >= 75) return "text-yellow-400 bg-yellow-500/5 border-yellow-500/20";
    return "text-red-400 bg-red-500/5 border-red-500/20";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Students</h1>
            <span className="bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {total} Student{total !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Manage student registrations, details, classes, and parent accounts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            data={students}
            type="both"
            exportFunction={(data, format) => handleExport(data, format)}
            className="h-9 text-sm border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800"
          />
          <Button
            onClick={() => setImportOpen(true)}
            className="bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-gray-200 h-9 text-sm"
          >
            <Upload className="size-4 mr-1.5" />
            Import CSV
          </Button>
          <Link href="/principal/students/new">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-sm shadow-lg shadow-blue-500/20">
              <Plus className="size-4 mr-1.5" />
              Add Student
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Students",
            value: stats.active,
            icon: Users,
            color: "text-blue-400",
            border: "border-blue-500/20",
            bg: "bg-blue-500/5",
          },
          {
            label: "New This Month",
            value: stats.thisMonth,
            icon: TrendingUp,
            color: "text-emerald-400",
            border: "border-emerald-500/20",
            bg: "bg-emerald-500/5",
          },
          {
            label: "Below 75% Attendance",
            value: stats.lowAttendance,
            icon: AlertTriangle,
            color: "text-red-400",
            border: "border-red-500/20",
            bg: "bg-red-500/5",
            alert: stats.lowAttendance > 0,
          },
          {
            label: "Without Class Assigned",
            value: stats.noClass,
            icon: UserX,
            color: "text-purple-400",
            border: "border-purple-500/20",
            bg: "bg-purple-500/5",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={cn(
                "border bg-gray-900/60 backdrop-blur-xl rounded-xl transition-all duration-200",
                stat.alert ? "border-red-500/40 shadow-lg shadow-red-500/5 animate-pulse" : stat.border
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`size-10 rounded-lg border ${stat.border} ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`size-4.5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-none">{loading ? "–" : stat.value}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, admission no, roll no..."
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

          {/* Class Filter */}
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[140px] w-full md:w-auto"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.displayName || `${cls.name} - ${cls.section}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Gender Filter */}
          <div className="relative">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[120px] w-full md:w-auto"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[120px] w-full md:w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {(search || classFilter !== "all" || genderFilter !== "all" || statusFilter !== "all") && (
            <Button
              onClick={() => {
                setSearch("");
                setClassFilter("all");
                setGenderFilter("all");
                setStatusFilter("all");
              }}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-10 px-3"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* ── Bulk Actions Bar ── */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-500/10 border border-blue-500/25 rounded-xl animate-fade-in">
            <span className="text-xs font-semibold text-blue-300">
              {selectedIds.length} Student{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setBulkClassOpen(true)}
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 h-7 text-[11px] px-2.5"
              >
                Move to Class
              </Button>
              <Button
                onClick={handleBulkExport}
                className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 h-7 text-[11px] px-2.5"
              >
                <Download className="size-3 mr-1" />
                Export CSV
              </Button>
              <Button
                onClick={() => setBulkDeactivateOpen(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 h-7 text-[11px] px-2.5"
              >
                Deactivate
              </Button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-gray-500 hover:text-gray-300 px-1 ml-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Students Table ── */}
      {loading ? (
        <StudentTableSkeleton />
      ) : (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <ResponsiveTable<Student>
              loading={loading}
              loadingText="Fetching students list..."
              emptyText="No students found"
              emptyIcon={
                <EmptyState
                  icon={Users}
                  title="No Students Yet"
                  description="Add your first student to get started"
                  actionLabel="Add Student"
                  onAction={() => router.push("/principal/students/new")}
                />
              }
              data={sortedStudents}
              rowIdAccessor={(s) => s.id}
              selectable
              selectedIds={new Set(selectedIds)}
              onSelectAll={() => handleSelectAll()}
              onSelectRow={(s) => handleSelectOne(s.id)}
              mobileCardHeader={(s) => (
                <div className="flex items-center gap-3">
                  {s.photo ? (
                    <Image
                      src={s.photo}
                      alt={s.name}
                      width={36}
                      height={36}
                      className="size-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <InitialsAvatar name={s.name} size={36} className="size-9" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white tracking-wide">{s.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">{s.admissionNumber}</div>
                  </div>
                </div>
              )}
              columns={[
                {
                  header: "Student Details",
                  hideInMobileCard: true,
                  render: (s) => (
                    <div className="flex items-center gap-3">
                      {s.photo ? (
                        <Image
                          src={s.photo}
                          alt={s.name}
                          width={36}
                          height={36}
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <InitialsAvatar name={s.name} size={36} className="size-9" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{s.name}</div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">{s.admissionNumber}</div>
                      </div>
                    </div>
                  )
                },
                {
                  header: "Class",
                  render: (s) => s.class ? `${s.class.name} - ${s.class.section}` : <span className="text-gray-600 italic">Not assigned</span>
                },
                {
                  header: "Roll No",
                  render: (s) => <span className="font-mono">{s.rollNumber || "-"}</span>
                },
                {
                  header: "Gender",
                  render: (s) => (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full font-medium border text-[10px] inline-block",
                        s.gender === "Male"
                          ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          : s.gender === "Female"
                          ? "bg-pink-500/10 text-pink-300 border-pink-500/20"
                          : "bg-gray-500/10 text-gray-300 border-gray-500/20"
                      )}
                    >
                      {s.gender}
                    </span>
                  )
                },
                {
                  header: "Parent Contact",
                  render: (s) => s.parent ? (
                    <div>
                      <div className="text-xs text-gray-300">{s.parent.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{s.parent.phone}</div>
                    </div>
                  ) : (
                    <span className="text-gray-600 italic text-xs">Unregistered</span>
                  )
                },
                {
                  header: "Attendance",
                  render: (s) => {
                    const attClass = getAttendanceBadge(s.attendancePct);
                    return s.attendancePct !== null ? (
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", attClass)}>
                        {s.attendancePct}%
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs italic">-</span>
                    );
                  }
                },
                {
                  header: "Status",
                  render: (s) => (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", s.isActive ? "bg-emerald-400" : "bg-red-400")} />
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  )
                }
              ]}
              actions={(s) => (
                <>
                  <Link href={`/principal/students/${s.id}`}>
                    <button className="h-8 w-8 rounded-lg bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center transition-all cursor-pointer w-full sm:w-8">
                      <Eye className="size-3.5" />
                      <span className="sm:hidden text-xs ml-1">View Profile</span>
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeactivateTarget(s)}
                    disabled={!s.isActive}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer w-full sm:w-8",
                      s.isActive
                        ? "bg-red-500/5 hover:bg-red-500/15 border-red-500/20 text-red-400"
                        : "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sm:hidden text-xs ml-1">Deactivate</span>
                  </button>
                </>
              )}
            />
          </div>

          {/* ── Table Footer / Pagination ── */}
          {students.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/[0.06] bg-white/[0.01] gap-4">
              {/* Limit Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="appearance-none bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Range / Count */}
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
              </span>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 w-8 p-0"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-8 w-8 p-0 text-xs font-semibold",
                        page === p
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "border-gray-700 text-gray-400 hover:bg-gray-800"
                      )}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 w-8 p-0"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── CSV Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={(o) => !o && setImportOpen(false)}>
        <DialogContent className="bg-gray-900 border border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-4.5 text-blue-400" />
              Import Students via CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-3 text-sm">
            <p className="text-gray-400 leading-relaxed">
              Upload a `.csv` file. Format columns as:
              <code className="block mt-1 bg-gray-950 p-2 rounded text-xs text-blue-300 font-mono">
                "Name", "DateOfBirth", "Gender", "AdmissionNumber", "RollNumber"
              </code>
            </p>

            {/* Custom file selector */}
            <div className="relative border border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl p-6 text-center transition-all bg-gray-950/40">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="size-8 text-gray-600 mx-auto mb-2" />
              <span className="text-xs text-gray-400 block font-medium">
                {csvFile ? csvFile.name : "Click or drag your CSV file here"}
              </span>
            </div>

            {/* Import preview */}
            {importPreview.length > 0 && (
              <div className="space-y-2 mt-4">
                <span className="text-xs font-semibold text-gray-400">Rows Detected (Preview of first 5):</span>
                <div className="max-h-36 overflow-y-auto border border-gray-800 rounded-lg p-2 bg-gray-950/60 font-mono text-[10px] space-y-1.5 text-gray-300">
                  {importPreview.map((item, index) => (
                    <div key={index} className="flex justify-between border-b border-white/[0.04] pb-1">
                      <span>{item.name} ({item.gender})</span>
                      <span className="text-blue-400">{item.admissionNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePerformImport}
              disabled={importing || importPreview.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {importing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Import Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single Deactivate Confirmation ── */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-400" />
              Deactivate Student Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to deactivate student{" "}
              <span className="text-white font-semibold">{deactivateTarget?.name}</span>?
              They will no longer appear on active attendance logs or fee registers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateSingle}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Deactivate Confirmation ── */}
      <AlertDialog open={bulkDeactivateOpen} onOpenChange={(o) => !o && setBulkDeactivateOpen(false)}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-400" />
              Deactivate Multiple Students
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to deactivate the{" "}
              <span className="text-white font-semibold">{selectedIds.length}</span> selected student(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Deactivate All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Class Assignment Dialog ── */}
      <Dialog open={bulkClassOpen} onOpenChange={(o) => !o && setBulkClassOpen(false)}>
        <DialogContent className="bg-gray-900 border border-white/[0.08] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-4.5 text-blue-400" />
              Re-assign Selected Students Class
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Select Target Class *</label>
              <div className="relative">
                <select
                  value={selectedTargetClass}
                  onChange={(e) => setSelectedTargetClass(e.target.value)}
                  className="appearance-none w-full bg-gray-850 border border-gray-700 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Choose Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayName || `${cls.name} - ${cls.section}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkClassOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkMoveClass}
              disabled={actionLoading || !selectedTargetClass}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
