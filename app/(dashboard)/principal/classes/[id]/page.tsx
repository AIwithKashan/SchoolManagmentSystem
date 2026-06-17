import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ArrowLeft,
  GraduationCap,
  User,
  BookOpen,
  Users,
  ChevronRight,
  CalendarCheck,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const GRADE_NAMES: Record<number, string> = {
  0: "Nursery", 1: "Prep",
  2: "Grade 1", 3: "Grade 2", 4: "Grade 3", 5: "Grade 4",
  6: "Grade 5", 7: "Grade 6", 8: "Grade 7", 9: "Grade 8",
  10: "Grade 9", 11: "Grade 10",
};

function getGradeBadge(level: number) {
  if (level <= 1) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (level <= 6) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (level <= 9) return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

function getAttendanceColor(pct: number | null) {
  if (pct === null) return "text-gray-500";
  if (pct >= 85) return "text-emerald-400";
  if (pct >= 75) return "text-yellow-400";
  return "text-red-400";
}

export default async function ClassDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
    redirect("/login");
  }
  const schoolId = session.user.schoolId;

  // Fetch class data
  const cls = await db.class.findFirst({
    where: { id: params.id, schoolId },
    include: {
      classTeacher: {
        include: {
          user: { select: { name: true, email: true, phone: true, avatar: true } },
        },
      },
      students: {
        where: { isActive: true },
        include: {
          attendances: { select: { status: true } },
        },
        orderBy: { name: "asc" },
      },
      classSubjects: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
          teacher: {
            include: { user: { select: { name: true } } },
          },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
  }).catch(() => null);

  if (!cls) notFound();

  const displayName = `${GRADE_NAMES[cls.gradeLevel] ?? cls.name} - ${cls.section}`;

  // Compute student attendance %
  const students = cls.students.map((student, idx) => {
    const total = student.attendances.length;
    const present = student.attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : null;
    return { ...student, attendancePct: pct, index: idx + 1 };
  });

  const avgAttendance =
    students.filter((s) => s.attendancePct !== null).length > 0
      ? Math.round(
          students
            .filter((s) => s.attendancePct !== null)
            .reduce((sum, s) => sum + (s.attendancePct ?? 0), 0) /
            students.filter((s) => s.attendancePct !== null).length
        )
      : null;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Breadcrumb & Back ── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/principal/classes"
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Classes
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-white">{displayName}</span>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
            <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", getGradeBadge(cls.gradeLevel))}>
              {cls.gradeLevel <= 1 ? "Early Years" : cls.gradeLevel <= 6 ? "Primary" : cls.gradeLevel <= 9 ? "Middle" : "Secondary"}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {students.length} students enrolled · {cls.classSubjects.length} subjects · Capacity: {cls.capacity}
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/principal/attendance`}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 text-xs font-medium transition-all"
          >
            <CalendarCheck className="size-3.5" />
            Attendance
          </Link>
          <Link
            href={`/principal/students`}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="size-3.5" />
            Add Student
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Students",
            value: students.length,
            icon: GraduationCap,
            color: "text-blue-400",
            border: "border-blue-500/20",
            bg: "bg-blue-500/5",
          },
          {
            label: "Subjects",
            value: cls.classSubjects.length,
            icon: BookOpen,
            color: "text-purple-400",
            border: "border-purple-500/20",
            bg: "bg-purple-500/5",
          },
          {
            label: "Avg Attendance",
            value: avgAttendance !== null ? `${avgAttendance}%` : "N/A",
            icon: CalendarCheck,
            color: avgAttendance !== null
              ? avgAttendance >= 85
                ? "text-emerald-400"
                : avgAttendance >= 75
                ? "text-yellow-400"
                : "text-red-400"
              : "text-gray-500",
            border: "border-emerald-500/20",
            bg: "bg-emerald-500/5",
          },
          {
            label: "Capacity",
            value: `${students.length}/${cls.capacity}`,
            icon: Users,
            color: "text-orange-400",
            border: "border-orange-500/20",
            bg: "bg-orange-500/5",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`border ${stat.border} bg-gray-900/60 backdrop-blur-xl rounded-xl`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`size-8 rounded-lg border ${stat.border} ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`size-3.5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Main Grid: Students + Subjects + Teacher ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Students Table (spans 2 cols) */}
        <div className="xl:col-span-2">
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-blue-400" />
                <CardTitle className="text-sm font-semibold text-white">
                  Students
                </CardTitle>
              </div>
              <span className="text-[11px] text-gray-500">{students.length} enrolled</span>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="py-12 text-center">
                  <GraduationCap className="size-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No students enrolled yet</p>
                  <Link
                    href="/principal/students"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <UserPlus className="size-3.5" />
                    Add First Student
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        {["#", "Name", "Roll No.", "Gender", "Attendance"].map((h) => (
                          <th
                            key={h}
                            className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {students.map((student) => (
                        <tr
                          key={student.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="px-4 py-3 text-xs text-gray-600 w-8">
                            {student.index}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/[0.08] flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-semibold text-white">
                                  {student.name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-white truncate max-w-[160px]">
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {student.rollNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                                student.gender === "Male" || student.gender === "male"
                                  ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                                  : "bg-pink-500/10 text-pink-300 border-pink-500/20"
                              )}
                            >
                              {student.gender}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                getAttendanceColor(student.attendancePct)
                              )}
                            >
                              {student.attendancePct !== null
                                ? `${student.attendancePct}%`
                                : "—"}
                            </span>
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

        {/* Right column: Teacher + Subjects */}
        <div className="space-y-4">
          {/* Class Teacher Card */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <User className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-white">
                  Class Teacher
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {cls.classTeacher ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-emerald-300">
                      {cls.classTeacher.user.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {cls.classTeacher.user.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {cls.classTeacher.user.email}
                    </p>
                    {cls.classTeacher.user.phone && (
                      <p className="text-[11px] text-gray-600">
                        {cls.classTeacher.user.phone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="size-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">No class teacher assigned</p>
                  <Link
                    href="/principal/classes"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Assign Teacher
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subjects Card */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-purple-400" />
                  <CardTitle className="text-sm font-semibold text-white">
                    Subjects
                  </CardTitle>
                </div>
                <span className="text-[10px] text-gray-500">
                  {cls.classSubjects.length} total
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {cls.classSubjects.length === 0 ? (
                <div className="text-center py-4">
                  <BookOpen className="size-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">No subjects assigned</p>
                  <Link
                    href="/principal/settings"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Add via AI Setup
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {cls.classSubjects.map((cs) => (
                    <div
                      key={cs.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-white">
                          {cs.subject.name}
                        </p>
                        <p className="text-[10px] text-gray-600">{cs.subject.code}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[80px] text-right">
                        {cs.teacher ? cs.teacher.user.name : (
                          <span className="text-gray-700 italic">Unassigned</span>
                        )}
                      </p>
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
