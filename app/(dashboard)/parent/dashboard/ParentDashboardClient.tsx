"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  CreditCard,
  ClipboardList,
  GraduationCap,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  School,
  Send,
  Sparkles,
  Award,
  Bell,
  FileText,
  User,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  dateString: string;
  iconType: "attendance" | "submission" | "grade" | "announcement" | "fee";
}

interface AgendaItem {
  id: string;
  type: "exam" | "assignment" | "event";
  title: string;
  subtitle: string;
  dateString: string;
  colorType: "purple" | "blue" | "emerald";
}

interface ParentDashboardClientProps {
  parentName: string;
  students: StudentInfo[];
  activeStudentId: string;
  todayStatus: "PRESENT" | "ABSENT" | "UNMARKED";
  monthStats: {
    presentCount: number;
    totalSchoolDays: number;
    percentage: number;
  };
  assignmentsStats: {
    pendingCount: number;
    dueThisWeekCount: number;
  };
  feeStats: {
    status: "PAID" | "PENDING" | "OVERDUE";
    amount: number;
    dueDate: string | null;
  };
  nextExam: {
    subjectName: string;
    examDate: string;
    daysAway: number;
    examType: string;
  } | null;
  activities: ActivityItem[];
  upcomingWeek: AgendaItem[];
  unreadMessagesCount: number;
}

export default function ParentDashboardClient({
  parentName,
  students,
  activeStudentId,
  todayStatus,
  monthStats,
  assignmentsStats,
  feeStats,
  nextExam,
  activities,
  upcomingWeek,
  unreadMessagesCount,
}: ParentDashboardClientProps) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState(activeStudentId);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    // Persist in cookie
    document.cookie = `selected_child_id=${childId}; path=/; max-age=31536000`; // 1 year
    // Force reload with searchParam
    router.push(`/parent/dashboard?childId=${childId}`);
  };

  const activeStudent = students.find((s) => s.id === selectedChildId) || students[0];

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveFrom || !leaveTo) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setIsSubmittingLeave(true);
      const res = await fetch("/api/parent/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          reason: leaveReason,
          fromDate: leaveFrom,
          toDate: leaveTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave request.");
      }

      toast.success("Leave application submitted successfully!");
      setLeaveReason("");
      setLeaveFrom("");
      setLeaveTo("");
      setIsLeaveOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Get first letters of name for avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white animate-fade-in bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Parent Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">Welcome back, {parentName} 👋</p>
        </div>
        {unreadMessagesCount > 0 && (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 flex items-center gap-1.5 self-start md:self-center">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>{unreadMessagesCount} unread message{unreadMessagesCount > 1 ? "s" : ""} from teachers</span>
          </Badge>
        )}
      </div>

      {/* Multi-Child Selector */}
      {students.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3">
          {students.map((child) => (
            <button
              key={child.id}
              onClick={() => handleChildSelect(child.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                selectedChildId === child.id
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 border border-violet-500/20 scale-[1.02]"
                  : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] border border-white/[0.06] hover:text-white"
              }`}
            >
              <GraduationCap className="size-4" />
              <span>{child.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Section 1 - Child Hero Card */}
      {activeStudent && (
        <Card className="glass-card overflow-hidden relative border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-xl">
          {/* Glowing Background Radial */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Photo Avatar */}
              {activeStudent.photo ? (
                <Image
                  src={activeStudent.photo}
                  alt={activeStudent.name}
                  width={64}
                  height={64}
                  className="size-16 rounded-2xl object-cover ring-2 ring-violet-500/30 shadow-md shrink-0"
                />
              ) : (
                <InitialsAvatar name={activeStudent.name} size={64} className="size-16 shrink-0" />
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-white leading-none">{activeStudent.name}</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Activity className="size-3 animate-pulse" />
                    <span>Active</span>
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5 bg-white/[0.04] px-2 py-0.5 rounded-md text-xs font-medium border border-white/[0.05]">
                    Class {activeStudent.className} - {activeStudent.section}
                  </span>
                  <span className="text-xs">Roll No: #{activeStudent.rollNumber || "N/A"}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <School className="size-3.5 shrink-0" />
                    {activeStudent.schoolName}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Inline */}
            <div className="flex flex-wrap gap-4 border-t lg:border-t-0 border-white/[0.08] pt-4 lg:pt-0">
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2.5 min-w-[120px]">
                <CalendarDays className="size-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Attendance</p>
                  <p className={`text-sm font-bold ${
                    monthStats.percentage >= 90 ? "text-emerald-400" : monthStats.percentage >= 75 ? "text-blue-400" : "text-rose-400"
                  }`}>
                    {monthStats.percentage}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2.5 min-w-[120px]">
                <BookOpen className="size-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Pending</p>
                  <p className={`text-sm font-bold ${assignmentsStats.pendingCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {assignmentsStats.pendingCount} assignment{assignmentsStats.pendingCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2.5 min-w-[120px]">
                <CreditCard className="size-5 text-purple-400 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Fee Status</p>
                  <p className={`text-sm font-bold ${
                    feeStats.status === "PAID" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {feeStats.status === "PAID" ? "Paid ✅" : "Due ⚠️"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2 - Today's Status Banner */}
      <div>
        {todayStatus === "PRESENT" ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-sm sm:text-base">✅ {activeStudent?.name} is at school today</span>
            </div>
          </div>
        ) : todayStatus === "ABSENT" ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <XCircle className="size-5 text-rose-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold text-sm sm:text-base">❌ {activeStudent?.name} was marked absent today</span>
                <p className="text-xs text-rose-300/70">Contact school if this is incorrect or apply for leave.</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsLeaveOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg self-start sm:self-center shrink-0 shadow-lg shadow-rose-900/30 transition-all text-xs"
            >
              Apply for Leave
            </Button>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] text-gray-300 rounded-xl p-4 flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-gray-400 shrink-0 animate-pulse" />
              <span className="font-medium text-sm sm:text-base text-gray-400">⏳ Attendance not marked yet</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 3 - Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance */}
        <Card className="glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-gray-400 tracking-wider">This Month Attendance</CardTitle>
            <div className="p-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 shrink-0">
              <CalendarDays className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-extrabold ${
                monthStats.percentage >= 90 ? "text-emerald-400" : monthStats.percentage >= 75 ? "text-blue-400" : "text-rose-400"
              }`}>
                {monthStats.percentage}%
              </div>
            </div>
            <div className="flex flex-col gap-1 w-full" data-slot="progress">
              <div className="relative flex h-2 w-full items-center overflow-x-hidden rounded-full bg-white/[0.04]">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    monthStats.percentage >= 90 ? "bg-emerald-500" : monthStats.percentage >= 75 ? "bg-blue-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${monthStats.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {monthStats.presentCount} days present out of {monthStats.totalSchoolDays} school days
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Assignments */}
        <Card className="glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Assignments</CardTitle>
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 shrink-0">
              <BookOpen className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-extrabold ${assignmentsStats.pendingCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {assignmentsStats.pendingCount}
              </div>
              <span className="text-xs text-gray-500">pending</span>
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>{assignmentsStats.dueThisWeekCount} due this week</span>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Redirecting to assignments portal..."); }} className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-0.5 transition-colors">
                View All <ArrowRight className="size-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Fee Status */}
        <Card className="glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Fee Status</CardTitle>
            <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 shrink-0">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                feeStats.status === "PAID"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
              }`}>
                {feeStats.status === "PAID" ? "Paid ✅" : "Due ⚠️"}
              </Badge>
              {feeStats.status !== "PAID" && (
                <div className="text-sm font-bold text-rose-400">Rs. {feeStats.amount.toLocaleString()} due</div>
              )}
            </div>
            {feeStats.status !== "PAID" ? (
              <div className="flex flex-col gap-2 pt-1.5">
                <p className="text-[10px] text-gray-500">Due: {feeStats.dueDate ? new Date(feeStats.dueDate).toLocaleDateString() : "N/A"}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/parent/fees")}
                  className="w-full text-xs py-1 h-7 border-violet-500/30 hover:border-violet-500 hover:bg-violet-600 hover:text-white transition-all text-violet-300 font-semibold"
                >
                  Pay Now
                </Button>
              </div>
            ) : (
              <div className="pt-4">
                <p className="text-[10px] text-gray-500">All current invoices cleared. Thank you!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Next Exam */}
        <Card className="glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Next Exam</CardTitle>
            <div className="p-2 rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-400 shrink-0">
              <ClipboardList className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextExam ? (
              <div className="space-y-1">
                <div className="text-lg font-bold text-white truncate">{nextExam.subjectName}</div>
                <div className="text-xs text-gray-400 font-medium">
                  {nextExam.examType} • {new Date(nextExam.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold mt-1">
                  {nextExam.daysAway} day{nextExam.daysAway !== 1 ? "s" : ""} away
                </Badge>
              </div>
            ) : (
              <div className="h-full flex items-center py-4">
                <p className="text-xs text-gray-500 italic">No exams scheduled soon 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4 - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Recent Activity Feed (60%) */}
        <Card className="lg:col-span-3 glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-white/[0.06] mb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="size-4.5 text-violet-400" />
              <span>Recent Activity Feed</span>
            </CardTitle>
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Activity history loading..."); }} className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              View All
            </a>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length > 0 ? (
              <div className="relative border-l border-white/[0.08] ml-3 pl-6 space-y-6">
                {activities.map((act) => {
                  let badgeColor = "bg-white/[0.03] border-white/[0.06] text-gray-400";
                  if (act.iconType === "attendance") badgeColor = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                  if (act.iconType === "submission") badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                  if (act.iconType === "grade") badgeColor = "bg-purple-500/10 border-purple-500/20 text-purple-400";
                  if (act.iconType === "announcement") badgeColor = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
                  if (act.iconType === "fee") badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

                  return (
                    <div key={act.id} className="relative group">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-background text-[8px] transition-all group-hover:scale-110 ${badgeColor}`}>
                        {act.iconType === "attendance" && "✅"}
                        {act.iconType === "submission" && "📝"}
                        {act.iconType === "grade" && "📊"}
                        {act.iconType === "announcement" && "📢"}
                        {act.iconType === "fee" && "💰"}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors leading-tight">
                          {act.title}
                        </p>
                        <p className="text-xs text-gray-400">{act.subtitle}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{act.dateString}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500 italic">No recent activities found for {activeStudent?.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Upcoming This Week (40%) */}
        <Card className="lg:col-span-2 glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between border-b border-white/[0.06] mb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="size-4.5 text-violet-400" />
                <span>Upcoming This Week</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {upcomingWeek.length > 0 ? (
                upcomingWeek.map((item) => {
                  let colorClass = "border-l-purple-500 text-purple-400 bg-purple-500/5";
                  if (item.colorType === "blue") colorClass = "border-l-blue-500 text-blue-400 bg-blue-500/5";
                  if (item.colorType === "emerald") colorClass = "border-l-emerald-500 text-emerald-400 bg-emerald-500/5";

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3.5 p-3 rounded-xl border border-white/[0.05] border-l-4 ${colorClass} hover:bg-white/[0.02] transition-all duration-300`}
                    >
                      <div className="space-y-1 grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider">{item.type}</span>
                          <span className="text-[10px] text-gray-500 font-semibold">{item.dateString}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug truncate">{item.title}</h4>
                        <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center space-y-2">
                  <span className="text-3xl">🎉</span>
                  <p className="text-xs text-gray-500 italic">Nothing scheduled this week</p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Section 5 - Quick Actions Row */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6">
        <CardHeader className="p-0 pb-3 mb-4 border-b border-white/[0.06]">
          <CardTitle className="text-sm font-bold uppercase text-gray-400 tracking-wider">Quick Portal Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Button
            variant="outline"
            onClick={() => router.push("/parent/messages")}
            className="flex flex-col items-center justify-center p-5 h-auto rounded-xl border-white/[0.08] hover:border-violet-500 bg-white/[0.01] hover:bg-violet-600/10 text-gray-300 hover:text-white transition-all duration-300 gap-3 group"
          >
            <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">Message Teacher</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Chat with class teachers</p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLeaveOpen(true)}
            className="flex flex-col items-center justify-center p-5 h-auto rounded-xl border-white/[0.08] hover:border-violet-500 bg-white/[0.01] hover:bg-violet-600/10 text-gray-300 hover:text-white transition-all duration-300 gap-3 group"
          >
            <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 group-hover:scale-110 transition-transform">
              <Calendar className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">Apply for Leave</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Request absent permission</p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/parent/fees")}
            className="flex flex-col items-center justify-center p-5 h-auto rounded-xl border-white/[0.08] hover:border-violet-500 bg-white/[0.01] hover:bg-violet-600/10 text-gray-300 hover:text-white transition-all duration-300 gap-3 group"
          >
            <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">Pay Fee</p>
              <p className="text-[9px] text-gray-500 mt-0.5">View and pay invoices</p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/parent/child")}
            className="flex flex-col items-center justify-center p-5 h-auto rounded-xl border-white/[0.08] hover:border-violet-500 bg-white/[0.01] hover:bg-violet-600/10 text-gray-300 hover:text-white transition-all duration-300 gap-3 group"
          >
            <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-400 group-hover:scale-110 transition-transform">
              <FileText className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">View Report Card</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Check exam worksheets</p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/parent/ai")}
            className="flex flex-col items-center justify-center p-5 h-auto rounded-xl border-white/[0.08] hover:border-violet-500 bg-white/[0.01] hover:bg-violet-600/10 text-gray-300 hover:text-white transition-all duration-300 gap-3 group col-span-2 sm:col-span-1"
          >
            <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-violet-400 group-hover:scale-110 transition-transform flex items-center justify-center relative">
              <Sparkles className="size-5" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">Ask Care AI</p>
              <p className="text-[9px] text-gray-500 mt-0.5">AI chat with student logs</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* LEAVE APPLICATION DIALOG */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-white/[0.08] text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
              <Calendar className="size-5 text-rose-400" />
              <span>Apply for Leave</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Submit a leave request for {activeStudent?.name}. The application will be forwarded to their class teacher for review.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLeaveSubmit} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fromDate" className="text-xs font-semibold text-gray-300">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toDate" className="text-xs font-semibold text-gray-300">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold text-gray-300">Reason for Leave</Label>
              <Textarea
                id="reason"
                placeholder="Explain the reason for leave request here..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                required
                rows={4}
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs rounded-xl resize-none"
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
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 rounded-xl px-5 shadow-lg shadow-rose-900/30 transition-all flex items-center gap-1.5"
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
