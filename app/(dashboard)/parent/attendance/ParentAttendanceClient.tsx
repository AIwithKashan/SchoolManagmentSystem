"use client";

import { EmptyState, ExportButton } from "@/components/shared";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  XCircle,
  Calendar,
  Send,
  Plus,
  BadgeAlert,
  ClipboardCheck,
  Building,
  Info,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";

interface StudentInfo {
  id: string;
  name: string;
  rollNumber: string | null;
  className: string;
  section: string;
  photo: string | null;
  schoolName: string;
}

interface ParentAttendanceClientProps {
  students: StudentInfo[];
  activeStudentId: string;
}

export default function ParentAttendanceClient({
  students,
  activeStudentId,
}: ParentAttendanceClientProps) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState(activeStudentId);

  // Month navigation
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // API Data
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Day Popup details state
  const [selectedDayDetail, setSelectedDayDetail] = useState<any>(null);
  const [isDayOpen, setIsDayOpen] = useState(false);

  // Leave Form state
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState("Medical");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");
  const [leaveDoc, setLeaveDoc] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const activeStudent = students.find((s) => s.id === selectedChildId) || students[0];

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    document.cookie = `selected_child_id=${childId}; path=/; max-age=31536000`;
    router.push(`/parent/attendance?childId=${childId}`);
  };

  const fetchAttendanceDetails = async (studentId: string, mNum: number, yNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/attendance/${studentId}?month=${mNum}&year=${yNum}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttendanceData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attendance calendar details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceDownload = async () => {
    if (!attendanceData) return;
    const { exportAttendancePDF } = await import("@/lib/export/pdf-generator");
    const recordsMapped = attendanceData.calendarDays
      .filter((cd: any) => cd.status !== "FUTURE" && cd.status !== "WEEKEND")
      .map((cd: any) => ({
        date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(cd.day).padStart(2, "0")}`,
        status: cd.status,
        remarks: cd.note || "-",
      }));

    exportAttendancePDF(
      recordsMapped,
      {
        name: activeStudent.name,
        admissionNumber: activeStudent.id,
        class: `${activeStudent.className} - ${activeStudent.section}`,
      },
      `${getMonthName(currentMonth)} ${currentYear}`
    );
  };

  useEffect(() => {
    if (selectedChildId) {
      fetchAttendanceDetails(selectedChildId, currentMonth, currentYear);
    }
  }, [selectedChildId, currentMonth, currentYear]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Submit leave application
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveFrom || !leaveTo || !leaveType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmittingLeave(true);
      const res = await fetch("/api/parent/attendance/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          reason: leaveReason,
          leaveType,
          fromDate: leaveFrom,
          toDate: leaveTo,
          additionalNote: leaveNotes,
          doctorNote: leaveDoc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Leave application submitted! Forwarded to class teacher.");
      setLeaveReason("");
      setLeaveType("Medical");
      setLeaveFrom("");
      setLeaveTo("");
      setLeaveNotes("");
      setLeaveDoc("");
      setIsLeaveOpen(false);
      
      // Refresh details
      fetchAttendanceDetails(selectedChildId, currentMonth, currentYear);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleDayClick = (dayData: any) => {
    if (dayData.status === "FUTURE" || dayData.status === "WEEKEND") return;
    setSelectedDayDetail(dayData);
    setIsDayOpen(true);
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date(2000, monthNumber - 1, 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Build calendar matrix
  const renderCalendar = () => {
    if (!attendanceData) return null;
    const { calendarDays } = attendanceData;

    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
    const paddingCellsCount = (firstDayOfWeek + 6) % 7; // Monday first column index

    const cells: React.ReactNode[] = [];

    // Padding cells
    for (let i = 0; i < paddingCellsCount; i++) {
      cells.push(<div key={`pad-${i}`} className="aspect-square bg-white/[0.005] border border-white/[0.02] rounded-xl" />);
    }

    // Actual calendar cells
    calendarDays.forEach((cd: any) => {
      let bgStyle = "bg-slate-900/60 border-white/[0.06] text-white";
      let cellClickable = true;

      if (cd.status === "PRESENT") bgStyle = "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-600/20 cursor-pointer scale-[1.01]";
      if (cd.status === "ABSENT") bgStyle = "bg-rose-600/10 border-rose-500/20 text-rose-400 font-bold hover:bg-rose-600/20 cursor-pointer scale-[1.01]";
      if (cd.status === "LATE") bgStyle = "bg-amber-600/10 border-amber-500/20 text-amber-400 font-bold hover:bg-amber-600/20 cursor-pointer scale-[1.01]";
      if (cd.status === "LEAVE") bgStyle = "bg-blue-600/10 border-blue-500/20 text-blue-400 font-bold hover:bg-blue-600/20 cursor-pointer scale-[1.01]";
      if (cd.status === "WEEKEND") {
        bgStyle = "bg-white/[0.02] border-white/[0.04] text-gray-600 cursor-not-allowed";
        cellClickable = false;
      }
      if (cd.status === "FUTURE") {
        bgStyle = "bg-white/[0.005] border-dashed border-white/[0.06] text-gray-700 cursor-not-allowed";
        cellClickable = false;
      }

      cells.push(
        <div
          key={`day-${cd.day}`}
          onClick={() => cellClickable && handleDayClick(cd)}
          className={`aspect-square border rounded-xl flex flex-col items-center justify-center relative p-2 transition-all ${bgStyle}`}
        >
          <span className="text-sm font-semibold">{cd.day}</span>
          {cd.status === "LATE" && <span className="text-[7px] uppercase bg-amber-500/20 px-1 rounded-sm text-amber-300 font-bold mt-1">LATE</span>}
          {cd.status === "LEAVE" && <span className="text-[7px] uppercase bg-blue-500/20 px-1 rounded-sm text-blue-300 font-bold mt-1">LEAVE</span>}
          {cd.status === "ABSENT" && <span className="text-[7px] uppercase bg-rose-500/20 px-1 rounded-sm text-rose-300 font-bold mt-1">ABSENT</span>}
          {cd.status === "PRESENT" && <span className="text-[7px] uppercase bg-emerald-500/20 px-1 rounded-sm text-emerald-300 font-bold mt-1">OK</span>}
        </div>
      );
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-gray-500 py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  // Find attendance rate to show in large text
  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (rate >= 75) return "text-blue-400 border-blue-500/20 bg-blue-500/5";
    return "text-rose-400 border-rose-500/20 bg-rose-500/5";
  };

  const calculatedPercentage = attendanceData?.calendarDays
    ? (() => {
        const days = attendanceData.calendarDays.filter((cd: any) => cd.status !== "FUTURE" && cd.status !== "WEEKEND");
        const present = days.filter((cd: any) => cd.status === "PRESENT" || cd.status === "LATE" || cd.status === "LEAVE").length;
        return days.length > 0 ? Math.round((present / days.length) * 100) : 100;
      })()
    : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Header section with switch child logic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Detailed Attendance Tracker
          </h2>
          <p className="text-muted-foreground mt-1">Monitor daily roll calls and submit leave requests</p>
        </div>

        {/* Student selectors switches */}
        {students.length > 1 && (
          <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] p-1.5 rounded-xl self-start md:self-center">
            {students.map((stud) => (
              <button
                key={stud.id}
                onClick={() => handleChildSelect(stud.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedChildId === stud.id
                    ? "bg-violet-600 text-white shadow-md border border-violet-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <GraduationCap className="size-3.5" />
                {stud.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Child Information and attendance rate */}
      {activeStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 glass-card border-white/[0.06] bg-white/[0.01] backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              {activeStudent.photo ? (
                <Image
                  src={activeStudent.photo}
                  alt={activeStudent.name}
                  width={64}
                  height={64}
                  className="size-16 rounded-2xl object-cover ring-2 ring-violet-500/20 shadow-md"
                />
              ) : (
                <InitialsAvatar name={activeStudent.name} size={64} className="size-16" />
              )}
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">{activeStudent.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Class {activeStudent.className} - {activeStudent.section}  •  Roll Number: #{activeStudent.rollNumber || "N/A"}
                </p>
                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <Building className="size-3" />
                  Campus: {activeStudent.schoolName}
                </p>
              </div>
            </div>
          </Card>

          {/* Large month attendance percent widget */}
          <Card className={`glass-card border-white/[0.06] rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-lg border-l-4 ${getAttendanceRateColor(calculatedPercentage)}`}>
            <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Attendance Rate (This Month)</p>
            <p className="text-4xl font-black mt-1.5">{calculatedPercentage}%</p>
            <p className="text-[10px] mt-1 text-gray-500">Excused leaves are counted as school days</p>
          </Card>
        </div>
      )}

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <span className="size-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Synchronizing calendar markings...</p>
        </div>
      ) : (
        attendanceData && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Monthly Calendar & Leave Button (60%) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={handlePrevMonth} className="size-8 rounded-lg border-white/[0.08] hover:bg-white/[0.05]">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <h3 className="text-base font-bold text-white min-w-[140px] text-center">
                      {getMonthName(currentMonth)} {currentYear}
                    </h3>
                    <Button size="icon" variant="outline" onClick={handleNextMonth} className="size-8 rounded-lg border-white/[0.08] hover:bg-white/[0.05]">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {attendanceData && (
                      <ExportButton
                        data={attendanceData.calendarDays}
                        type="pdf"
                        exportFunction={() => handleAttendanceDownload()}
                        className="h-8 text-xs border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-800"
                      />
                    )}
                    <Button
                      onClick={() => setIsLeaveOpen(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 h-8 rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <Plus className="size-3.5" />
                      Apply for Leave
                    </Button>
                  </div>
                </div>

                {renderCalendar()}

                {/* Legends descriptor */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 justify-center text-[10px] font-medium text-gray-500 border-t border-white/[0.06] pt-4">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20" />Present</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-md bg-rose-500/10 border border-rose-500/20" />Absent</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-md bg-amber-500/10 border border-amber-500/20" />Late</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-md bg-blue-500/10 border border-blue-500/20" />Leave</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-md bg-white/[0.02] border border-white/[0.06]" />Weekend</span>
                </div>
              </Card>

              {/* Leave request status registry history */}
              <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                  <ClipboardCheck className="size-4.5 text-violet-400" />
                  <span>Leave Application Log History</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-white/[0.08]">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Leave Dates</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Reason</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Teacher Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.leaveHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6">
                            <EmptyState
                              icon={Calendar}
                              title="No Attendance Records"
                              description="Attendance records will show here"
                              actionLabel={null}
                              onAction={null}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendanceData.leaveHistory.map((leave: any) => {
                          let statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                          if (leave.status === "APPROVED") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          if (leave.status === "REJECTED") statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                          return (
                            <TableRow key={leave.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                              <TableCell className="font-bold text-white text-xs whitespace-nowrap">
                                {leave.fromDateString} {leave.toDateString !== leave.fromDateString ? `- ${leave.toDateString}` : ""}
                              </TableCell>
                              <TableCell className="text-gray-300 text-xs">{leave.leaveType}</TableCell>
                              <TableCell className="text-gray-300 text-xs max-w-[150px] truncate" title={leave.reason}>{leave.reason}</TableCell>
                              <TableCell>
                                <Badge className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${statusColor}`}>
                                  {leave.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-400 italic text-xs truncate max-w-[200px]" title={leave.teacherResponse}>
                                {leave.teacherResponse}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>

            {/* Right: Academic Year summaries (40%) */}
            <Card className="lg:col-span-2 glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5 mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="size-4.5 text-violet-400" />
                    <span>Monthly Breakdown Summary</span>
                  </h3>
                  
                  <Button size="icon" variant="outline" onClick={() => toast.success("Downloading Academic Year summary worksheet PDF...")} className="size-7 rounded border-white/[0.08] hover:bg-white/[0.04]">
                    <Download className="size-3.5" />
                  </Button>
                </div>
                
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-4">Academic year: 2025-2026</p>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-white/[0.06]">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Month</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 text-center">P</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-rose-400 text-center">A</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-amber-400 text-center">L</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-blue-400 text-center">Lv</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.monthlySummary.map((row: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                          <TableCell className="text-xs font-semibold text-white">{row.monthName}</TableCell>
                          <TableCell className="text-xs font-bold text-emerald-400 text-center">{row.present}</TableCell>
                          <TableCell className="text-xs font-bold text-rose-400 text-center">{row.absent}</TableCell>
                          <TableCell className="text-xs font-bold text-amber-400 text-center">{row.late}</TableCell>
                          <TableCell className="text-xs font-bold text-blue-400 text-center">{row.leave}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </div>
        )
      )}

      {/* ──── DAY DETAILS DIALOG POPUP ──── */}
      <Dialog open={isDayOpen} onOpenChange={setIsDayOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-white/[0.08] text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="size-4.5 text-violet-400" />
              <span>Marking Verification Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedDayDetail && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-gray-400">Date:</span>
                <span className="font-bold text-white">
                  {new Date(selectedDayDetail.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl text-center space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</p>
                  <Badge className={`px-2 py-0.5 text-[10px] font-extrabold tracking-wider border rounded-md uppercase ${
                    selectedDayDetail.status === "PRESENT"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : selectedDayDetail.status === "ABSENT"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : selectedDayDetail.status === "LATE"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {selectedDayDetail.status}
                  </Badge>
                </div>

                <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl text-center space-y-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Time Checked</p>
                  <p className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <Clock className="size-3.5 text-violet-400" />
                    {selectedDayDetail.markedTime || "N/A"}
                  </p>
                </div>
              </div>

              <div className="p-4 border border-white/[0.06] bg-white/[0.01] rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <User className="size-3.5 text-violet-400" />
                  <span>Marked By: {selectedDayDetail.teacherName}</span>
                </div>
                <div className="text-xs text-gray-300 italic pt-1 leading-relaxed border-t border-white/[0.03]">
                  {selectedDayDetail.note ? `Note: "${selectedDayDetail.note}"` : "Marked Present during routine morning period roll call."}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button onClick={() => setIsDayOpen(false)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs h-9 rounded-xl shadow">
                  Close Detail
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──── LEAVE APPLICATION DIALOG FORM ──── */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-white/[0.08] text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2.5">
              <Calendar className="size-5 text-rose-400" />
              <span>Apply for Excused Leave</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Apply for leave for {activeStudent?.name}. Your application will be evaluated by the class teacher.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLeaveSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="leaveFrom" className="text-xs font-semibold text-gray-300">Start Date</label>
                <Input
                  id="leaveFrom"
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="leaveTo" className="text-xs font-semibold text-gray-300">End Date</label>
                <Input
                  id="leaveTo"
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leaveType" className="text-xs font-semibold text-gray-300">Leave Category Type</label>
              <select
                id="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white px-3 h-10 text-xs rounded-xl focus:outline-none focus:border-violet-500"
              >
                <option value="Medical">Medical Sick Leave 🤒</option>
                <option value="Personal">Personal Urgency Leave 🏠</option>
                <option value="Travel">Family Travel Leave ✈️</option>
                <option value="Other">Other / Emergency Leave 🚨</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leaveReason" className="text-xs font-semibold text-gray-300">Reason Description (Required)</label>
              <Textarea
                id="leaveReason"
                placeholder="State the core reason for applying for leave..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                required
                rows={3}
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 text-xs rounded-xl resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leaveNotes" className="text-xs font-semibold text-gray-300">Additional Instructions (Optional)</label>
              <Textarea
                id="leaveNotes"
                placeholder="Provide homework completion plan or details..."
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                rows={2}
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 text-xs rounded-xl resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leaveDoc" className="text-xs font-semibold text-gray-300">Doctor Note Link or File Name (Optional)</label>
              <Input
                id="leaveDoc"
                placeholder="e.g. Scanned doctor receipt / clinic slip reference"
                value={leaveDoc}
                onChange={(e) => setLeaveDoc(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLeaveOpen(false)}
                className="border-white/[0.08] hover:bg-white/[0.05] text-xs h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingLeave}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 rounded-xl px-5 shadow flex items-center gap-1.5"
              >
                {isSubmittingLeave ? (
                  <>
                    <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
