"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Award,
  UserX,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { TeacherTableSkeleton } from "@/components/shared/skeletons";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ExportButton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
interface Teacher {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  qualification: string;
  specialization: string | null;
  joiningDate: string;
  salary: number | null;
  isClassTeacher: boolean;
  managedClass: {
    id: string;
    name: string;
    section: string;
  } | null;
  subjects: string[];
  assignedClasses: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    classTeachers: 0,
    unassigned: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Revealing Salary row keys
  const [revealedSalaries, setRevealedSalaries] = useState<Set<string>>(new Set());

  // Sorting
  const [sortField, setSortField] = useState<keyof Teacher>("employeeId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Deactivate handler states
  const [deactivateTarget, setDeactivateTarget] = useState<Teacher | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch teachers
  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/principal/teachers?${query}`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      toast.error("Failed to load teachers data");
    }
    setLoading(false);
  }, [search, page, limit]);

  const handleExport = async (dataToExport: Teacher[], format: "pdf" | "excel") => {
    if (format === "pdf") {
      const { exportTeachersPDF } = await import("@/lib/export/pdf-generator");
      const mapped = dataToExport.map((t) => ({
        name: t.name,
        employeeId: t.employeeId,
        qualification: t.qualification,
        specialization: t.specialization || "-",
        joiningDate: t.joiningDate ? new Date(t.joiningDate).toLocaleDateString() : "-",
        salary: t.salary ?? 0,
      }));
      exportTeachersPDF(mapped, { name: "EduMind AI Academy", city: "Main" });
    } else {
      const { exportTeachersExcel } = await import("@/lib/export/excel-generator");
      const mapped = dataToExport.map((t) => ({
        name: t.name,
        employeeId: t.employeeId,
        email: t.email,
        phone: t.phone || "-",
        qualification: t.qualification,
        specialization: t.specialization || "-",
        joiningDate: t.joiningDate ? new Date(t.joiningDate).toLocaleDateString() : "-",
        salary: t.salary ?? 0,
      }));
      exportTeachersExcel(mapped);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // Reset page on search changes
  useEffect(() => {
    setPage(1);
  }, [search, qualificationFilter, statusFilter, limit]);

  // Toggle salary visibility
  const toggleSalary = (id: string) => {
    setRevealedSalaries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Perform soft deactivation
  const handleDeactivateTeacher = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/principal/teachers/${deactivateTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Teacher profile ${deactivateTarget.name} deactivated successfully`);
        setDeactivateTarget(null);
        await loadTeachers();
      } else {
        toast.error("Failed to deactivate teacher");
      }
    } catch {
      toast.error("Network error occurred");
    }
    setActionLoading(false);
  };

  // Advanced Sorting
  const handleSort = (field: keyof Teacher) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter clientside details
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchQual =
        qualificationFilter === "all" ||
        t.qualification.toLowerCase() === qualificationFilter.toLowerCase();
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.isActive) ||
        (statusFilter === "inactive" && !t.isActive);
      return matchQual && matchStatus;
    });
  }, [teachers, qualificationFilter, statusFilter]);

  const sortedTeachers = useMemo(() => {
    return [...filteredTeachers].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredTeachers, sortField, sortOrder]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Teachers Workspace</h1>
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {total} Instructor{total !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Manage academic instructors, specialized qualifications, and classroom curriculum assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            data={teachers}
            type="both"
            exportFunction={(data, format) => handleExport(data, format)}
            className="h-9 text-sm border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800"
          />
          <Link href="/principal/teachers/new">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-sm shadow-lg shadow-blue-500/20">
              <Plus className="size-4 mr-1.5" />
              Add Instructor
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Teachers",
            value: stats.total,
            icon: Users,
            color: "text-blue-400",
            border: "border-blue-500/20",
            bg: "bg-blue-500/5",
          },
          {
            label: "Active Instructors",
            value: stats.active,
            icon: UserCheck,
            color: "text-emerald-400",
            border: "border-emerald-500/20",
            bg: "bg-emerald-500/5",
          },
          {
            label: "Class Teachers assigned",
            value: stats.classTeachers,
            icon: Award,
            color: "text-purple-400",
            border: "border-purple-500/20",
            bg: "bg-purple-500/5",
          },
          {
            label: "General/Unassigned",
            value: stats.unassigned,
            icon: UserX,
            color: "text-amber-400",
            border: "border-amber-500/20",
            bg: "bg-amber-500/5",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl transition-all duration-200"
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

      {/* ── Search & Filters Row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Text Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Employee ID, Name, or Email..."
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

        {/* Qualification filter */}
        <div className="relative">
          <select
            value={qualificationFilter}
            onChange={(e) => setQualificationFilter(e.target.value)}
            className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[150px] w-full sm:w-auto"
          >
            <option value="all">Qualifications</option>
            <option value="Matric">Matric</option>
            <option value="FA">FA</option>
            <option value="BA">BA</option>
            <option value="MA">MA</option>
            <option value="B.Ed">B.Ed</option>
            <option value="M.Ed">M.Ed</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-gray-900/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-purple-500/50 cursor-pointer min-w-[120px] w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {(search || qualificationFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setQualificationFilter("all");
              setStatusFilter("all");
            }}
            className="text-xs text-gray-400 hover:text-white border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] rounded-lg px-3 h-10 transition-all whitespace-nowrap shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Teachers Table ── */}
      {loading ? (
        <TeacherTableSkeleton />
      ) : (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <ResponsiveTable<Teacher>
              loading={loading}
              loadingText="Fetching instructors database..."
              emptyText="No instructors found"
              emptyIcon={
                <EmptyState
                  icon={GraduationCap}
                  title="No Teachers Added"
                  description="Add teachers to assign them to classes"
                  actionLabel="Add Teacher"
                  onAction={() => router.push("/principal/teachers/new")}
                />
              }
              data={sortedTeachers}
              rowIdAccessor={(t) => t.id}
              mobileCardHeader={(t) => (
                <div className="flex items-center gap-3">
                  {t.avatar ? (
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      width={36}
                      height={36}
                      className="size-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <InitialsAvatar name={t.name} size={36} className="size-9" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white tracking-wide">{t.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{t.employeeId}</div>
                  </div>
                </div>
              )}
              columns={[
                {
                  header: "Instructor Details",
                  hideInMobileCard: true,
                  render: (t) => (
                    <div className="flex items-center gap-3">
                      {t.avatar ? (
                        <Image
                          src={t.avatar}
                          alt={t.name}
                          width={36}
                          height={36}
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <InitialsAvatar name={t.name} size={36} className="size-9" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{t.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{t.employeeId}</div>
                      </div>
                    </div>
                  )
                },
                {
                  header: "Subjects taught",
                  render: (t) => (
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.length > 0 ? (
                        t.subjects.map((sub, index) => (
                          <span key={index} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 italic text-[11px]">Unassigned</span>
                      )}
                    </div>
                  )
                },
                {
                  header: "Classes taught",
                  render: (t) => (
                    <div className="flex flex-wrap gap-1">
                      {t.assignedClasses.length > 0 ? (
                        t.assignedClasses.map((cls, index) => (
                          <span key={index} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                            {cls}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 italic text-[11px]">None</span>
                      )}
                    </div>
                  )
                },
                {
                  header: "Joining Date",
                  render: (t) => (
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Calendar className="size-3.5 text-gray-500" />
                      <span>{t.joiningDate ? new Date(t.joiningDate).toLocaleDateString() : "-"}</span>
                    </div>
                  )
                },
                {
                  header: "Salary (Revealed)",
                  render: (t) => {
                    const isSalaryVisible = revealedSalaries.has(t.id);
                    return (
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-gray-300 font-bold min-w-[65px] block">
                          {t.salary !== null
                            ? isSalaryVisible
                              ? `Rs. ${t.salary.toLocaleString()}`
                              : "•••••••"
                            : "Not Set"}
                        </span>
                        {t.salary !== null && (
                          <button
                            onClick={() => toggleSalary(t.id)}
                            className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                          >
                            {isSalaryVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        )}
                      </div>
                    );
                  }
                },
                {
                  header: "Status",
                  render: (t) => (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border text-[10px]",
                        t.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", t.isActive ? "bg-emerald-400" : "bg-red-400")} />
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  )
                }
              ]}
              actions={(t) => (
                <>
                  <Link href={`/principal/teachers/${t.id}`}>
                    <button className="h-8 w-8 rounded-lg bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center transition-all cursor-pointer w-full sm:w-8">
                      <Eye className="size-3.5" />
                      <span className="sm:hidden text-xs ml-1">View Profile</span>
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeactivateTarget(t)}
                    disabled={!t.isActive}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer w-full sm:w-8",
                      t.isActive
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
          {teachers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/[0.06] bg-white/[0.01] gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="appearance-none bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <span className="text-xs text-gray-500">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
              </span>

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

      {/* ── Single Deactivate Confirmation Alert ── */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-400" />
              Deactivate Instructor Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to deactivate teacher{" "}
              <span className="text-white font-semibold">{deactivateTarget?.name}</span>?
              They will lose access to the portal, and their classroom/curriculum logs will be suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateTeacher}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Deactivate Instructor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
