"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ExportButton } from "@/components/shared";

interface AssignedClass {
  id: string;
  name: string;
}

interface MonthlyRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  studentId: string;
  note?: string | null;
  student: {
    id: string;
    name: string;
    rollNumber: string | null;
  };
}

interface StudentStat {
  studentId: string;
  name: string;
  rollNumber: string;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  totalDays: number;
  percentage: number;
}

interface AttendanceHistoryClientProps {
  classId: string;
  assignedClasses: AssignedClass[];
}

export default function AttendanceHistoryClient({
  classId,
  assignedClasses,
}: AttendanceHistoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [stats, setStats] = useState<StudentStat[]>([]);
  const [totalMarkedDays, setTotalMarkedDays] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State for clicked day details
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Load monthly logs and stats
  useEffect(() => {
    const fetchHistoryData = async () => {
      setLoading(true);
      try {
        const [recordsRes, statsRes] = await Promise.all([
          fetch(`/api/teacher/attendance/${classId}?month=${month}&year=${year}`),
          fetch(`/api/teacher/attendance/${classId}/stats?month=${month}&year=${year}`),
        ]);

        if (!recordsRes.ok || !statsRes.ok) {
          throw new Error("Failed to load history data");
        }

        const recordsData = await recordsRes.json();
        const statsData = await statsRes.json();

        setRecords(recordsData || []);
        setStats(statsData?.stats || []);
        setTotalMarkedDays(statsData?.totalMarkedDays || 0);
        setSelectedDay(null); // Reset day details
      } catch (err: any) {
        console.error(err);
        toast.error("Could not fetch attendance history for this month.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [classId, month, year]);

  // Handle class swap
  const handleClassChange = (newClassId: string) => {
    router.push(`/teacher/attendance/history?classId=${newClassId}`);
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handlePdfExport = async () => {
    if (stats.length === 0) {
      toast.error("No statistics to export");
      return;
    }
    const { exportAttendanceSummaryPDF } = await import("@/lib/export/pdf-generator");
    const mapped = stats.map((s) => ({
      studentName: s.name,
      class: classNameSelected,
      presentDays: s.presentCount,
      absentDays: s.absentCount,
      rate: s.percentage,
    }));
    exportAttendanceSummaryPDF(mapped, { name: "EduMind AI Academy", city: "Main" });
  };

  // Calendar calculations
  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    // 0 = Sunday, 1 = Monday ... 6 = Saturday
    let day = new Date(year, month - 1, 1).getDay();
    // Normalize to: 0 = Monday, 6 = Sunday
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth();
  const firstDayIndex = getFirstDayOfMonth();

  // Generate date list cells
  const calendarCells = [];
  // Padded cells at start
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  // Get status coding for a specific day
  const getDayStatus = (dayNum: number) => {
    const dayStr = String(dayNum).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const dateQueryStr = `${year}-${monthStr}-${dayStr}`;

    const dayRecords = records.filter(
      (r) => r.date.split("T")[0] === dateQueryStr
    );

    if (dayRecords.length === 0) {
      return { code: "NOT_MARKED", label: "Not Marked", count: 0 };
    }

    const absentCount = dayRecords.filter((r) => r.status === "ABSENT").length;

    if (absentCount === 0) {
      return { code: "ALL_PRESENT", label: "All Present", count: 0 };
    } else if (absentCount <= 3) {
      return { code: "SOME_ABSENT", label: `${absentCount} Absent`, count: absentCount };
    } else {
      return { code: "MANY_ABSENT", label: `${absentCount} Absent`, count: absentCount };
    }
  };

  // Filter records for selected day
  const getSelectedDayRecords = () => {
    if (selectedDay === null) return [];
    const dayStr = String(selectedDay).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const dateQueryStr = `${year}-${monthStr}-${dayStr}`;
    return records.filter((r) => r.date.split("T")[0] === dateQueryStr);
  };

  const selectedDayRecords = getSelectedDayRecords();

  const getMonthName = () => {
    return currentDate.toLocaleString("default", { month: "long" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Present</span>;
      case "ABSENT":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Absent</span>;
      case "LATE":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">Late</span>;
      case "LEAVE":
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Leave</span>;
      default:
        return null;
    }
  };

  const classNameSelected = assignedClasses.find((c) => c.id === classId)?.name || "Class";

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block text-center border-b border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black uppercase tracking-wide">EduMind AI Attendance Report</h1>
        <p className="text-sm text-gray-700 mt-1">
          {classNameSelected} • {getMonthName()} {year} • Total School Days Marked: {totalMarkedDays}
        </p>
      </div>

      {/* Header controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher/attendance")}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Logs</h1>
            <p className="text-gray-400 text-sm mt-0.5">Historical calendar tracking per class.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Select Dropdown */}
          <select
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="bg-gray-900 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {assignedClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* PDF Export button using ExportButton */}
          <ExportButton
            data={stats}
            type="pdf"
            exportFunction={() => handlePdfExport()}
            className="h-9 text-xs font-semibold py-2 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white"
          />

          {/* Print PDF Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all shrink-0 h-9"
          >
            <Printer className="size-4" />
            Print Page
          </button>
        </div>
      </div>

      {/* Month Navigation Control Banner (Hidden during print, or styled) */}
      <div className="flex items-center justify-between border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-3 print:border-black print:bg-white print:text-black">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-400 hover:text-white print:hidden"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-blue-400 print:text-black shrink-0" />
          <h2 className="text-base font-bold text-white tracking-tight print:text-black">
            {getMonthName()} {year}
          </h2>
          <span className="text-gray-700 print:text-gray-400">•</span>
          <span className="text-xs font-medium text-gray-400 print:text-gray-700">
            {totalMarkedDays} marked school day{totalMarkedDays === 1 ? "" : "s"}
          </span>
        </div>

        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-400 hover:text-white print:hidden"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Main Grid: Calendar Layout + Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left (3 Columns): Calendar Grid */}
        <div className="lg:col-span-3 space-y-4 print:col-span-5">
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 print:border-black print:bg-white print:text-black">
            {/* Weekdays row */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-500 print:text-black">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Calendar dates cells */}
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                Loading history logs...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="aspect-square bg-transparent rounded-lg"
                      />
                    );
                  }

                  const dayStatus = getDayStatus(day);
                  const isSelected = selectedDay === day;

                  // CSS classes depending on status
                  let statusClass = "bg-white/[0.01] border-white/[0.04] text-gray-400";
                  if (dayStatus.code === "ALL_PRESENT") {
                    statusClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20";
                  } else if (dayStatus.code === "SOME_ABSENT") {
                    statusClass = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20";
                  } else if (dayStatus.code === "MANY_ABSENT") {
                    statusClass = "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20";
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => dayStatus.code !== "NOT_MARKED" && setSelectedDay(day)}
                      disabled={dayStatus.code === "NOT_MARKED"}
                      className={`aspect-square flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all text-left relative group ${statusClass} ${
                        isSelected ? "ring-2 ring-blue-500 border-transparent scale-102" : ""
                      }`}
                    >
                      <span className="text-xs font-bold">{day}</span>
                      
                      {/* Sub-label count */}
                      {dayStatus.count > 0 && (
                        <span className="text-[8px] font-bold opacity-80 mt-0.5">
                          {dayStatus.count}A
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Color-coding Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs pl-1 print:text-black">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0" />
              <span>All Present</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-yellow-500/10 border border-yellow-500/20 shrink-0" />
              <span>1 - 3 Absent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-red-500/10 border border-red-500/20 shrink-0" />
              <span>4+ Absent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-white/[0.01] border border-white/[0.04] shrink-0" />
              <span>Not Marked / Holiday</span>
            </span>
          </div>
        </div>

        {/* Right (2 Columns): Details Panel / Stats table */}
        <div className="lg:col-span-2 space-y-6 print:col-span-5">
          {/* Day details Panel */}
          {selectedDay !== null ? (
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 print:border-black print:bg-white print:text-black">
              <CardHeader className="p-0 pb-3 border-b border-white/[0.05] print:border-black flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-white print:text-black">
                    Logs for {getMonthName()} {selectedDay}, {year}
                  </CardTitle>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {selectedDayRecords.length} records retrieved
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1 text-gray-500 hover:text-white text-xs print:hidden"
                >
                  Close
                </button>
              </CardHeader>
              
              <CardContent className="p-0 pt-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                {selectedDayRecords.length === 0 ? (
                  <p className="text-gray-500 text-xs py-4 text-center">No logs recorded.</p>
                ) : (
                  <div className="divide-y divide-white/[0.03] print:divide-black">
                    {selectedDayRecords.map((r) => (
                      <div key={r.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate print:text-black">{r.student.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Roll: {r.student.rollNumber || "N/A"}</p>
                          {r.note && (
                            <p className="text-[10px] text-blue-300 print:text-gray-600 italic mt-1 flex items-center gap-1">
                              <FileText className="size-3 shrink-0" />
                              {r.note}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(r.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 print:hidden">
              <CardContent className="p-0 flex flex-col items-center justify-center py-8 text-center text-gray-500 gap-2">
                <Info className="size-8 text-gray-600" />
                <p className="text-xs font-medium">Daily Roster Details</p>
                <p className="text-[10px] max-w-[200px]">
                  Click on any marked day in the calendar grid to view the list of student statuses.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Student Stats Tab */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 print:border-black print:bg-white print:text-black">
            <CardHeader className="p-0 pb-3 border-b border-white/[0.05] print:border-black">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-blue-400 print:text-black" />
                <CardTitle className="text-sm font-semibold text-white print:text-black">
                  Monthly Roll Stats
                </CardTitle>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Attendance rate percentages per student this month.
              </p>
            </CardHeader>
            
            <CardContent className="p-0 pt-3 max-h-[350px] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="text-center py-6 text-xs text-gray-500">Loading student stats...</div>
              ) : stats.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">No active students.</div>
              ) : (
                <div className="divide-y divide-white/[0.03] print:divide-black">
                  {stats.map((s) => (
                    <div key={s.studentId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate print:text-black">{s.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Roll: {s.rollNumber} • P:{s.presentCount} A:{s.absentCount}
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            s.percentage >= 85
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : s.percentage >= 75
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
