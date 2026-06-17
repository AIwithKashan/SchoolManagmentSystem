import React, { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSchoolInfo } from "@/lib/db-queries";
import { 
  getSchoolStats,
  getTodayAttendance,
  getAnnouncements,
  getFeeStats,
  getRecentAuditLogs,
  getUpcomingExams,
  getAtRiskStudents
} from "@/lib/cache";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  DollarSign,
  UserPlus,
  Megaphone,
  BarChart3,
  Receipt,
  Bot,
  Activity,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  PlusCircle,
  Clock,
  School,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Helper functions ───────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("PKR", "Rs.");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main page component ────────────────────────────────────────────

export default async function PrincipalDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const schoolId = session.user.schoolId;
  const userName = session.user.name ?? "Principal";

  // ── Dates ──
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  // First day of month for at-risk calculations
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Parallel cached data fetching ──
  const [
    schoolStats,
    todayAttendance,
    announcements,
    feeStats,
    school,
  ] = await Promise.all([
    getSchoolStats(schoolId),
    getTodayAttendance(schoolId),
    getAnnouncements(schoolId, 3),
    getFeeStats(schoolId),
    getSchoolInfo(schoolId),
  ]);

  const studentsCount = schoolStats.students;
  const teachersCount = schoolStats.teachers;
  const classesCount = schoolStats.classes;
  const attendancePct = todayAttendance.total > 0 ? todayAttendance.percentage : null;
  const feeCollected = feeStats.reduce((sum: number, f: any) => sum + (f._sum.paidAmount || 0), 0);
  const pendingCount = feeStats.find((f: any) => f.status === "PENDING")?._count || 0;
  const overdueCount = feeStats.find((f: any) => f.status === "OVERDUE")?._count || 0;
  const pendingFees = pendingCount + overdueCount;

  // ── Parallel cached database queries ──
  const [
    auditLogs,
    exams,
    atRiskStudents,
  ] = await Promise.all([
    getRecentAuditLogs(schoolId),
    getUpcomingExams(schoolId),
    getAtRiskStudents(schoolId),
  ]);

  // ── Attendance colour ──
  const attendanceColor =
    attendancePct === null
      ? "text-gray-400"
      : attendancePct > 85
      ? "text-emerald-400"
      : attendancePct >= 75
      ? "text-yellow-400"
      : "text-red-400";

  // ── Stat cards config ──
  const stats = [
    {
      title: "Total Students",
      value: studentsCount.toLocaleString(),
      trend: "Active students",
      icon: Users,
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
      bgColor: "bg-blue-500/5",
      glowColor: "shadow-blue-500/10",
    },
    {
      title: "Teaching Staff",
      value: teachersCount.toLocaleString(),
      trend: "All departments",
      icon: GraduationCap,
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      bgColor: "bg-emerald-500/5",
      glowColor: "shadow-emerald-500/10",
    },
    {
      title: "Today's Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "N/A",
      trend:
        attendancePct !== null
          ? attendancePct > 85
            ? "Excellent attendance"
            : attendancePct >= 75
            ? "Average — needs attention"
            : "Low — action required"
          : "No records today",
      icon: CalendarCheck,
      iconColor: attendanceColor,
      borderColor:
        attendancePct === null
          ? "border-gray-500/20"
          : attendancePct > 85
          ? "border-emerald-500/20"
          : attendancePct >= 75
          ? "border-yellow-500/20"
          : "border-red-500/20",
      bgColor:
        attendancePct === null
          ? "bg-gray-500/5"
          : attendancePct > 85
          ? "bg-emerald-500/5"
          : attendancePct >= 75
          ? "bg-yellow-500/5"
          : "bg-red-500/5",
      glowColor: "shadow-purple-500/10",
    },
    {
      title: "Fee This Month",
      value: formatCurrency(feeCollected),
      trend: `${pendingFees} pending`,
      icon: DollarSign,
      iconColor: "text-orange-400",
      borderColor: "border-orange-500/20",
      bgColor: "bg-orange-500/5",
      glowColor: "shadow-orange-500/10",
    },
  ];

  // ── Quick actions ──
  const quickActions = [
    {
      label: "Add Student",
      icon: UserPlus,
      href: "/principal/students/new",
      color: "text-blue-400",
      bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
    },
    {
      label: "Add Teacher",
      icon: GraduationCap,
      href: "/principal/teachers/new",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
    },
    {
      label: "Announcement",
      icon: Megaphone,
      href: "/principal/announcements/new",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20",
    },
    {
      label: "View Reports",
      icon: BarChart3,
      href: "/principal/reports",
      color: "text-purple-400",
      bg: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
    },
    {
      label: "Fee Report",
      icon: Receipt,
      href: "/principal/fees",
      color: "text-orange-400",
      bg: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20",
    },
    {
      label: "Ask Afia AI",
      icon: Bot,
      href: "/principal/ai",
      color: "text-pink-400",
      bg: "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20",
    },
  ];

  // ── Target role badge colour ──
  const roleColors: Record<string, string> = {
    ALL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    TEACHER: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    PARENT: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    STUDENT: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  };

  return (
    <div className="space-y-8 pb-8">
      {/* ── Section 1: Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-gray-400 text-sm">
              {formatDate(now)}
            </p>
            {school && (
              <span className="text-gray-600 text-sm">•</span>
            )}
            {school && (
              <p className="text-gray-400 text-sm">{school.currentTerm}</p>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {userName} 👋
          </h1>
          {school && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <School className="size-3.5 text-muted-foreground shrink-0" />
              {school.name}
              {school.academicYear && (
                <span className="text-muted-foreground">• {school.academicYear}</span>
              )}
            </p>
          )}
        </div>

        {/* Health score badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 shrink-0">
          <Sparkles className="size-4 text-purple-400 shrink-0 animate-pulse" />
          <div>
            <p className="text-[10px] text-gray-500 leading-none">School Health</p>
            <p className="text-sm font-bold text-purple-300 leading-none mt-0.5">84/100</p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Stats Grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden border ${stat.borderColor} bg-card backdrop-blur-xl rounded-xl shadow-lg ${stat.glowColor}`}
            >
              {/* Subtle glow blob */}
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${stat.bgColor} blur-2xl pointer-events-none`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground leading-tight">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 rounded-lg border ${stat.borderColor} ${stat.bgColor} shrink-0`}>
                  <Icon className={`size-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.iconColor}`}>{stat.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Section 3: Quick Actions ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${action.bg} transition-all duration-200 hover:scale-105 active:scale-95 group`}
              >
                <Icon className={`size-5 ${action.color} group-hover:scale-110 transition-transform`} />
                <span className="text-[10px] font-medium text-gray-300 text-center leading-tight">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Section 4: Activity Feed + At-Risk Students ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Recent Activity (60%) */}
        <div className="lg:col-span-3">
          <Card className="border border-border bg-card backdrop-blur-xl rounded-xl h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent Activity
                </CardTitle>
              </div>
              <Link
                href="/principal/reports"
                className="text-[11px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5 transition-colors"
              >
                View all <ChevronRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="size-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="size-3 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white leading-snug truncate">
                          {log.action}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-gray-600">{log.user.name}</span>
                          <span className="text-gray-700">·</span>
                          <Clock className="size-2.5 text-gray-600" />
                          <span className="text-[10px] text-gray-600">
                            {timeAgo(new Date(log.createdAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: At-Risk Students (40%) */}
        <div className="lg:col-span-2">
          <Card
            className={`border rounded-xl h-full ${
              atRiskStudents.length > 0
                ? "border-red-500/20 bg-red-950/20"
                : "border-emerald-500/20 bg-emerald-950/10"
            } backdrop-blur-xl`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                {atRiskStudents.length > 0 ? (
                  <AlertTriangle className="size-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                )}
                <CardTitle className="text-sm font-semibold text-white">
                  {atRiskStudents.length > 0 ? "At-Risk Students" : "Attendance Status"}
                </CardTitle>
              </div>
              {atRiskStudents.length > 0 && (
                <Link
                  href="/principal/students"
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-0.5 transition-colors"
                >
                  View All <ChevronRight className="size-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent className="pt-3">
              {atRiskStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                  <p className="text-emerald-300 text-sm font-medium text-center">
                    All students on track ✅
                  </p>
                  <p className="text-gray-500 text-[11px] text-center">
                    No students below 75% this month
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-red-400 mb-2">
                    {atRiskStudents.length} student{atRiskStudents.length > 1 ? "s" : ""} below 75% attendance this month
                  </p>
                  {atRiskStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {student.name}
                        </p>
                         <p className="text-[10px] text-gray-500 mt-0.5">
                           {student.class ? `${student.class.name} - ${student.class.section}` : "Unassigned"}
                         </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          (student.attendancePct ?? 0) < 60
                            ? "bg-red-500/20 text-red-300"
                            : "bg-orange-500/20 text-orange-300"
                        }`}
                      >
                        {student.attendancePct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 5: Upcoming Exams + Recent Announcements ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Exams */}
        <Card className="border border-border bg-card backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-purple-500" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Upcoming Exams
              </CardTitle>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {exams.length} scheduled
            </span>
          </CardHeader>
          <CardContent className="pt-3">
            {exams.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">
                No exams scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <BookOpen className="size-3.5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {exam.subject.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {exam.class.name} - {exam.class.section}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-purple-600">
                        {new Intl.DateTimeFormat("en-PK", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(exam.examDate))}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {exam.examType.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="border border-border bg-card backdrop-blur-xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-yellow-500" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Recent Announcements
              </CardTitle>
            </div>
            <Link
              href="/principal/announcements/new"
              className="flex items-center gap-1 text-[11px] text-yellow-500 hover:text-yellow-600 transition-colors"
            >
              <PlusCircle className="size-3" />
              Create
            </Link>
          </CardHeader>
          <CardContent className="pt-3">
            {announcements.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">No announcements yet</p>
                <Link
                  href="/principal/announcements/new"
                  className="inline-flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-600 border border-yellow-500/30 rounded-lg px-3 py-1.5 bg-yellow-500/5 hover:bg-yellow-500/10 transition-all"
                >
                  <PlusCircle className="size-3.5" />
                  Create Announcement
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="size-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="size-3 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {ann.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                            roleColors[ann.targetRole] ?? roleColors["ALL"]
                          }`}
                        >
                          {ann.targetRole}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {new Intl.DateTimeFormat("en-PK", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(ann.createdAt))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
