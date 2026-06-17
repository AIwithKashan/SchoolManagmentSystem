import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  Calendar,
  School,
  Clock,
  ChevronRight,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Helper functions ───────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeAgo(date: Date | null): string {
  if (!date) return "N/A";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main page component ────────────────────────────────────────────

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch Teacher profile from DB using session userId
  const teacher = await db.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      school: true,
    },
  });

  if (!teacher) {
    // Fallback if the profile does not exist in db
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="size-12 text-yellow-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
        <p className="text-gray-400 text-sm max-w-md">
          We could not find a teacher profile associated with your account. Please contact your administrator.
        </p>
      </div>
    );
  }

  const userName = teacher.user.name ?? session.user.name ?? "Teacher";
  const schoolName = teacher.school.name;
  const academicYear = teacher.school.academicYear;
  const currentTerm = teacher.school.currentTerm;

  // ── Dates ──
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // ── Parallel Data Fetching ──
  const [
    classSubjectsRaw,
    todayAttendancesRaw,
    unreadMessagesCountRaw,
    upcomingExamsRaw,
    recentSubmissionsRaw,
    teacherAssignmentsRaw,
    totalPendingGradingRaw,
  ] = await Promise.allSettled([
    // 1. Classes and Subjects assigned to this teacher
    db.classSubject.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            students: { select: { id: true } },
          },
        },
        subject: true,
      },
    }),
    // 2. Today's attendance marked by this teacher
    db.attendance.findMany({
      where: {
        markedById: teacher.id,
        date: { gte: todayStart, lt: todayEnd },
      },
      select: { classId: true },
    }),
    // 3. Unread messages count
    db.message.count({
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
    }),
    // 4. Exams for all classes this week (to filter in JS)
    db.exam.findMany({
      where: {
        schoolId: teacher.schoolId,
        examDate: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        class: true,
        subject: true,
      },
      orderBy: { examDate: "asc" },
    }),
    // 5. Recent pending submissions to grade
    db.submission.findMany({
      where: {
        assignment: { teacherId: teacher.id },
        status: "PENDING",
      },
      include: {
        student: { select: { name: true, photo: true } },
        assignment: {
          include: {
            class: { select: { name: true, section: true } },
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // 6. Assignments created by this teacher
    db.assignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        submissions: { select: { id: true } },
        class: {
          include: {
            students: { select: { id: true } },
          },
        },
      },
    }),
    // 7. Total count of pending submissions to grade
    db.submission.count({
      where: {
        assignment: { teacherId: teacher.id },
        status: "PENDING",
      },
    }),
  ]);

  // ── Resolve settled values with fallbacks ──
  const classSubjects = classSubjectsRaw.status === "fulfilled" ? classSubjectsRaw.value : [];
  const todayAttendances = todayAttendancesRaw.status === "fulfilled" ? todayAttendancesRaw.value : [];
  const unreadMessagesCount = unreadMessagesCountRaw.status === "fulfilled" ? unreadMessagesCountRaw.value : 0;
  const schoolExams = upcomingExamsRaw.status === "fulfilled" ? upcomingExamsRaw.value : [];
  const recentSubmissions = recentSubmissionsRaw.status === "fulfilled" ? recentSubmissionsRaw.value : [];
  const teacherAssignments = teacherAssignmentsRaw.status === "fulfilled" ? teacherAssignmentsRaw.value : [];
  const totalPendingGrading = totalPendingGradingRaw.status === "fulfilled" ? totalPendingGradingRaw.value : 0;

  // ── Process Assigned Classes (Distinct) ──
  const assignedClassesMap = new Map<string, typeof classSubjects[0]["class"]>();
  classSubjects.forEach((cs) => {
    if (cs.class) {
      assignedClassesMap.set(cs.class.id, cs.class);
    }
  });
  const assignedClasses = Array.from(assignedClassesMap.values());
  const totalClassesCount = assignedClasses.length;

  // ── Process Today's Timeline Classes ──
  const markedClassIds = new Set(todayAttendances.map((att) => att.classId));
  const timelineClasses = classSubjects.map((cs) => {
    const isMarked = markedClassIds.has(cs.classId);
    return {
      classId: cs.classId,
      className: `${cs.class.name} ${cs.class.section}`,
      subjectName: cs.subject.name,
      timeSlot: "Scheduled",
      isMarked,
    };
  });

  // ── Process Pending Assignments (Past due date & not all students submitted) ──
  const pendingAssignments = teacherAssignments.filter((assignment) => {
    const isPastDue = new Date(assignment.dueDate) < now;
    const totalStudents = assignment.class.students.length;
    const totalSubmissions = assignment.submissions.length;
    return isPastDue && totalSubmissions < totalStudents;
  });
  const pendingAssignmentsCount = pendingAssignments.length;

  // ── Process Upcoming Exams (Next 7 days, teacher's classes) ──
  const assignedClassIds = Array.from(assignedClassesMap.keys());
  const upcomingExams = schoolExams.filter((exam) => assignedClassIds.includes(exam.classId));
  const upcomingExamsCount = upcomingExams.length;

  // ── Stats Cards Config ──
  const stats = [
    {
      title: "My Classes",
      value: totalClassesCount.toString(),
      trend: `${classSubjects.length} subject assignments`,
      icon: BookOpen,
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
      bgColor: "bg-blue-500/5",
      glowColor: "shadow-blue-500/10",
    },
    {
      title: "Pending Grading",
      value: totalPendingGrading.toString(),
      trend: `${pendingAssignmentsCount} past due assignments`,
      icon: ClipboardList,
      iconColor: "text-orange-400",
      borderColor: "border-orange-500/20",
      bgColor: "bg-orange-500/5",
      glowColor: "shadow-orange-500/10",
      badge: totalPendingGrading > 5 ? `${totalPendingGrading} Action Needed` : null,
    },
    {
      title: "Messages",
      value: unreadMessagesCount.toString(),
      trend: "Unread communications",
      icon: MessageSquare,
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/20",
      bgColor: "bg-purple-500/5",
      glowColor: "shadow-purple-500/10",
    },
    {
      title: "This Week's Exams",
      value: upcomingExamsCount.toString(),
      trend: "Next 7 days scheduled",
      icon: Calendar,
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      bgColor: "bg-emerald-500/5",
      glowColor: "shadow-emerald-500/10",
    },
  ];

  // ── Attendance need count ──
  const classesNeedAttendance = timelineClasses.filter((tc) => !tc.isMarked).length;

  return (
    <div className="space-y-8 pb-8">
      {/* ── SECTION 1 - Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-gray-400 text-sm">{formatDate(now)}</p>
            <span className="text-gray-600 text-sm">•</span>
            <p className="text-gray-400 text-sm">{currentTerm}</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {getGreeting()}, {userName} 👋
          </h1>
          <p className="text-gray-400 mt-1 flex items-center gap-1.5 text-sm">
            <School className="size-3.5 text-gray-500 shrink-0" />
            {schoolName}
            <span className="text-gray-600">•</span>
            <span>{academicYear}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500 font-medium text-xs">
              You have {timelineClasses.length} class{timelineClasses.length === 1 ? "" : "es"} today
            </span>
          </p>
        </div>

        {/* Quick status badge */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 shrink-0">
          <Sparkles className="size-4 text-orange-400 shrink-0 animate-pulse" />
          <div>
            <p className="text-[10px] text-gray-500 leading-none">Grading Backlog</p>
            <p className="text-sm font-bold text-orange-300 leading-none mt-0.5">
              {totalPendingGrading} pending to grade
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 - Today's Classes Timeline ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Today&apos;s Classes Timeline
        </h2>
        {timelineClasses.length === 0 ? (
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-6 text-center text-gray-500 text-sm">
            No classes today
          </Card>
        ) : (
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/[0.08]">
            {timelineClasses.map((item, idx) => (
              <div
                key={idx}
                className="flex-none w-72 p-4 rounded-xl border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl space-y-3 relative overflow-hidden group hover:border-white/[0.1] transition-all"
              >
                {/* Visual side accent border */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    item.isMarked ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />

                <div className="flex items-start justify-between min-w-0">
                  <div className="min-w-0 pl-1">
                    <h3 className="text-sm font-bold text-white truncate">{item.className}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.subjectName}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium bg-white/[0.03] px-2 py-0.5 rounded-full shrink-0">
                    <Clock className="size-3 text-gray-500" />
                    {item.timeSlot}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {item.isMarked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        ✅ Marked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                        ⚠️ Not Marked Yet
                      </span>
                    )}
                  </div>

                  {!item.isMarked && (
                    <Link
                      href={`/teacher/attendance?classId=${item.classId}`}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-0.5 transition-colors group/btn"
                    >
                      Mark Attendance
                      <ArrowRight className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3 - Stats Grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden border ${stat.borderColor} bg-gray-900/60 backdrop-blur-xl rounded-xl shadow-lg ${stat.glowColor}`}
            >
              {/* Glow blob */}
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${stat.bgColor} blur-2xl pointer-events-none`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-gray-400 leading-tight">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 rounded-lg border ${stat.borderColor} ${stat.bgColor} shrink-0`}>
                  <Icon className={`size-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className={`text-2xl font-bold ${stat.iconColor}`}>{stat.value}</div>
                  {stat.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      {stat.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── SECTION 4 - Two Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT (60%): Recent Submissions to Grade */}
        <div className="lg:col-span-3">
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-orange-400" />
                <CardTitle className="text-sm font-semibold text-white">
                  Recent Submissions to Grade
                </CardTitle>
              </div>
              <Link
                href="/teacher/assignments"
                className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5 transition-colors"
              >
                View All <ChevronRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              {recentSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                  <p className="text-emerald-300 text-sm font-medium text-center">
                    No pending submissions 🎉
                  </p>
                  <p className="text-gray-500 text-[11px] text-center">
                    All student homework has been graded!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="pb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="pb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
                        <th className="pb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                        <th className="pb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="pb-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {recentSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="py-2.5 text-xs font-medium text-white truncate max-w-[120px]">
                            {sub.student.name}
                          </td>
                          <td className="py-2.5 text-xs text-gray-300 truncate max-w-[140px]">
                            {sub.assignment.title}
                          </td>
                          <td className="py-2.5 text-xs text-gray-400 shrink-0">
                            {sub.assignment.class.name} {sub.assignment.class.section}
                          </td>
                          <td className="py-2.5 text-xs text-gray-500 shrink-0">
                            {timeAgo(sub.submittedAt)}
                          </td>
                          <td className="py-2.5 text-right shrink-0">
                            <Link
                              href={`/teacher/assignments/submissions/${sub.id}`}
                              className="inline-flex items-center justify-center text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg font-medium hover:bg-orange-500/20 transition-all"
                            >
                              Grade Now
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT (40%): Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 pl-1">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            {/* Mark Attendance Card */}
            <Link
              href="/teacher/attendance"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">Mark Attendance</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  {classesNeedAttendance > 0
                    ? `${classesNeedAttendance} class${classesNeedAttendance === 1 ? "" : "es"} need attendance today`
                    : "All attendance complete"}
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Create Assignment Card */}
            <Link
              href="/teacher/assignments/new"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0 group-hover:scale-110 transition-transform">
                <PlusCircle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">Create Assignment</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Add new assignments and set due dates
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Generate Lesson Plan Card */}
            <Link
              href="/teacher/lessons/new"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">Generate Lesson Plan (AI)</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Draft quick curriculum outline with Afia AI
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Messages Card */}
            <Link
              href="/teacher/messages"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">Messages</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  {unreadMessagesCount > 0
                    ? `${unreadMessagesCount} unread parent communication(s)`
                    : "No new messages"}
                </p>
              </div>
              <ChevronRight className="size-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 5 - Upcoming Exams Banner ── */}
      {upcomingExams.length > 0 && (
        <Card className="border border-orange-500/20 bg-orange-950/20 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <Calendar className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-orange-300">
                📅 You have {upcomingExams.length} exam{upcomingExams.length === 1 ? "" : "s"} this week
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                {upcomingExams.map((exam) => (
                  <span key={exam.id} className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-orange-400" />
                    <strong>{exam.subject.name}</strong> ({exam.class.name} {exam.class.section}) on{" "}
                    {new Intl.DateTimeFormat("en-PK", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(exam.examDate))}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/teacher/exams"
            className="self-start md:self-auto inline-flex items-center justify-center text-xs text-white bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-1.5 hover:bg-orange-500/30 transition-all font-semibold shrink-0"
          >
            View Schedule
          </Link>
        </Card>
      )}
    </div>
  );
}
