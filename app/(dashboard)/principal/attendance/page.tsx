"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CalendarCheck2,
  Users,
  Search,
  ChevronDown,
  Loader2,
  TrendingUp,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Clock,
  ExternalLink,
  Phone,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/shared";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassAttendanceItem {
  id: string;
  className: string;
  section: string;
  displayName: string;
  teacherName: string;
  studentCount: number;
  markedCount: number;
  presentCount: number;
  rate: number;
}

interface AtRiskStudentItem {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  className: string;
  parentName: string;
  parentPhone: string;
  totalDays: number;
  presentDays: number;
  rate: number;
}

interface RecentActivityLog {
  id: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  note: string | null;
}

interface TodayStats {
  totalMarked: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  lateCount: number;
  rate: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  ABSENT: "bg-red-500/10 text-red-400 border border-red-500/20",
  LATE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  LEAVE: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

export default function AttendanceWorkstationPage() {
  const [activeTab, setActiveTab] = useState<"classes" | "at-risk" | "logs">("classes");
  const [loading, setLoading] = useState(true);

  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalMarked: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    lateCount: 0,
    rate: 0,
  });
  const [classBreakdown, setClassBreakdown] = useState<ClassAttendanceItem[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudentItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentActivityLog[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // ─── API: Fetch Data ────────────────────────────────────────────────
  const loadAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/principal/attendance");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load attendance metrics");

      setTodayStats(data.todayStats);
      setClassBreakdown(data.classBreakdown);
      setAtRiskStudents(data.atRiskStudents);
      setRecentLogs(data.recentLogs);
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve attendance details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  const handleAttendanceExport = async (format: "pdf" | "excel") => {
    if (atRiskStudents.length === 0) {
      toast.error("No at-risk students to export");
      return;
    }
    if (format === "pdf") {
      const { exportAttendanceSummaryPDF } = await import("@/lib/export/pdf-generator");
      const mapped = atRiskStudents.map((s) => ({
        studentName: s.name,
        class: s.className,
        presentDays: s.presentDays,
        absentDays: s.totalDays - s.presentDays,
        rate: s.rate,
      }));
      exportAttendanceSummaryPDF(mapped, { name: "EduMind AI Academy", city: "Main" });
    } else {
      const { exportAttendanceExcel } = await import("@/lib/export/excel-generator");
      const mapped = atRiskStudents.map((s) => ({
        studentName: s.name,
        days: {} as Record<number, string>,
        presentCount: s.presentDays,
        totalDays: s.totalDays,
      }));
      const currentMonth = new Date().toLocaleString("default", { month: "long" });
      exportAttendanceExcel(mapped, currentMonth, "At-Risk-Roster");
    }
  };

  // ─── Filters ────────────────────────────────────────────────────────
  const filteredClasses = classBreakdown.filter((c) =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAtRisk = atRiskStudents.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = recentLogs.filter((l) =>
    l.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="size-8 text-blue-400" />
            Attendance Workstation
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Monitor class check-ins, review chronically absent students, and audit daily logs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <ExportButton
            data={atRiskStudents}
            type="both"
            exportFunction={(data, format) => handleAttendanceExport(format)}
            className="h-9 text-sm border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-800"
          />
          <Button
            onClick={loadAttendanceData}
            variant="outline"
            className="border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-850 h-9"
          >
            🔄 Refresh Feed
          </Button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Today&apos;s Attendance</span>
              <p className="text-2xl font-bold text-emerald-400">{todayStats.rate.toFixed(1)}%</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="size-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Absent Today</span>
              <p className="text-2xl font-bold text-red-400">{todayStats.absentCount}</p>
            </div>
            <div className="size-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <UserX className="size-5 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Approved Leaves</span>
              <p className="text-2xl font-bold text-blue-400">{todayStats.leaveCount}</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Clock className="size-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">At-Risk Students</span>
              <p className="text-2xl font-bold text-amber-400">{atRiskStudents.length}</p>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="size-5 text-amber-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/20 p-2 border border-gray-850 rounded-xl">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab("classes");
              setSearchQuery("");
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition duration-150",
              activeTab === "classes" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            Class Standings
          </button>
          <button
            onClick={() => {
              setActiveTab("at-risk");
              setSearchQuery("");
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition duration-150 flex items-center gap-1.5",
              activeTab === "at-risk" ? "bg-amber-600 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <AlertTriangle className="size-3.5" />
            At-Risk List ({atRiskStudents.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("logs");
              setSearchQuery("");
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition duration-150",
              activeTab === "logs" ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            Check-In Log
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "classes"
                ? "Search class or teacher..."
                : "Search student by name/ID..."
            }
            className="pl-9 bg-slate-950/60 border-gray-800 text-gray-100 placeholder:text-gray-500 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium font-mono">Calculating attendance aggregates...</span>
        </div>
      ) : (
        <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
          {/* TAB 1: Classes breakdown */}
          {activeTab === "classes" && (
            <div className="overflow-x-auto">
              {filteredClasses.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No classes matched your query.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/80 bg-slate-950/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Class & Section</th>
                      <th className="py-3.5 px-5">Class Teacher</th>
                      <th className="py-3.5 px-5 text-center">Total Students</th>
                      <th className="py-3.5 px-5 text-center">Marked Today</th>
                      <th className="py-3.5 px-5 text-center">Present Today</th>
                      <th className="py-3.5 px-5">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-sm">
                    {filteredClasses.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-800/10 transition">
                        <td className="py-3.5 px-5 font-bold text-white">{cls.displayName}</td>
                        <td className="py-3.5 px-5 text-gray-300">{cls.teacherName}</td>
                        <td className="py-3.5 px-5 text-center text-gray-300 font-semibold">{cls.studentCount}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                              cls.markedCount === cls.studentCount
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : cls.markedCount > 0
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}
                          >
                            {cls.markedCount === cls.studentCount
                              ? "Complete"
                              : cls.markedCount > 0
                              ? "Partial"
                              : "Not Marked"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center text-emerald-400 font-bold">{cls.presentCount}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-200 w-12">{cls.rate.toFixed(0)}%</span>
                            <div className="w-24 bg-gray-800 rounded-full h-1.5 hidden sm:block">
                              <div
                                className={cn(
                                  "h-1.5 rounded-full transition-all duration-300",
                                  cls.rate >= 90 ? "bg-emerald-500" : cls.rate >= 75 ? "bg-blue-500" : "bg-red-500"
                                )}
                                style={{ width: `${cls.rate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: At Risk List */}
          {activeTab === "at-risk" && (
            <div className="overflow-x-auto">
              {filteredAtRisk.length === 0 ? (
                <div className="py-20 text-center text-emerald-400 font-semibold flex flex-col items-center justify-center gap-2">
                  <CheckCircle className="size-10 text-emerald-500" />
                  <span>Excellent Standings!</span>
                  <p className="text-gray-500 text-xs font-normal max-w-xs mt-1">
                    No active students are currently below the critical 75% monthly attendance threshold.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/80 bg-slate-950/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Student Details</th>
                      <th className="py-3.5 px-5">Class</th>
                      <th className="py-3.5 px-5 text-center">Billed Days</th>
                      <th className="py-3.5 px-5 text-center">Present Days</th>
                      <th className="py-3.5 px-5 text-center">Monthly Rate</th>
                      <th className="py-3.5 px-5">Parent Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-sm">
                    {filteredAtRisk.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/10 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{s.name}</span>
                            <span className="text-[10px] text-gray-500">ID: {s.admissionNumber}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-gray-300 font-medium">{s.className}</td>
                        <td className="py-3.5 px-5 text-center text-gray-300">{s.totalDays}</td>
                        <td className="py-3.5 px-5 text-center text-gray-300">{s.presentDays}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
                            {s.rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col text-xs text-gray-400">
                            <span className="font-semibold text-white">{s.parentName}</span>
                            <a
                              href={`tel:${s.parentPhone}`}
                              className="text-amber-400 hover:underline flex items-center gap-1 mt-0.5 w-fit"
                            >
                              <Phone className="size-3" />
                              {s.parentPhone}
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: Recent Activity Logs */}
          {activeTab === "logs" && (
            <div className="overflow-x-auto">
              {filteredLogs.length === 0 ? (
                <div className="py-20 text-center text-gray-500">No daily logs found matching filters.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/80 bg-slate-950/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Student</th>
                      <th className="py-3.5 px-5">Class</th>
                      <th className="py-3.5 px-5">Date & Time</th>
                      <th className="py-3.5 px-5 text-center">Status</th>
                      <th className="py-3.5 px-5">Teacher Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-sm">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/10 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{log.studentName}</span>
                            <span className="text-[10px] text-gray-500">ID: {log.admissionNumber}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-gray-300 font-medium">{log.className}</td>
                        <td className="py-3.5 px-5 text-gray-400 text-xs">
                          {new Date(log.date).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider inline-block", STATUS_COLORS[log.status])}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-gray-400 text-xs truncate max-w-[200px]" title={log.note ?? ""}>
                          {log.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
