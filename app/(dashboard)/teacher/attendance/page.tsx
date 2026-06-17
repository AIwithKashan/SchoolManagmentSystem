import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Users, CalendarCheck, Clock, History, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeacherAttendanceSelectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacher) {
    redirect("/login");
  }

  // 1. Fetch classes assigned to this teacher
  const classSubjects = await db.classSubject.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: {
        include: {
          students: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      },
      subject: true,
    },
  });

  // Today's boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // 2. Fetch today's attendance logs marked by this teacher
  const todayAttendances = await db.attendance.findMany({
    where: {
      markedById: teacher.id,
      date: { gte: todayStart, lt: todayEnd },
    },
    select: { classId: true },
  });

  const markedClassIds = new Set(todayAttendances.map((a) => a.classId));

  // Process distinct classes
  const classesMap = new Map<string, any>();
  classSubjects.forEach((cs) => {
    if (!cs.class) return;
    const isMarked = markedClassIds.has(cs.classId);
    
    if (!classesMap.has(cs.classId)) {
      classesMap.set(cs.classId, {
        id: cs.classId,
        name: `${cs.class.name} ${cs.class.section}`,
        studentCount: cs.class.students.length,
        isMarked,
        subjects: [cs.subject.name],
      });
    } else {
      const existing = classesMap.get(cs.classId);
      if (!existing.subjects.includes(cs.subject.name)) {
        existing.subjects.push(cs.subject.name);
      }
    }
  });

  const assignedClasses = Array.from(classesMap.values());

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Attendance Tracking</h1>
        <p className="text-gray-400 text-sm mt-1">
          Select a class below to mark today&apos;s attendance or view history logs.
        </p>
      </div>

      {assignedClasses.length === 0 ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-8 text-center rounded-xl">
          <AlertTriangle className="size-10 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-white font-bold text-base">No Classes Assigned</h2>
          <p className="text-gray-400 text-sm mt-1">
            You are not currently assigned to teach any subjects in any classes. Please contact the administrator.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assignedClasses.map((cls) => (
            <Card
              key={cls.id}
              className="relative overflow-hidden border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl hover:border-white/[0.12] transition-all duration-200 group flex flex-col justify-between"
            >
              {/* Highlight accent strip */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  cls.isMarked ? "bg-emerald-500" : "bg-yellow-500"
                }`}
              />

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                      {cls.name}
                    </CardTitle>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">
                      {cls.subjects.join(", ")}
                    </p>
                  </div>
                  {cls.isMarked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Marked ✅
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                      <Clock className="size-3 text-yellow-400" />
                      Not Marked ⚠️
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-2 space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4 text-gray-500 shrink-0" />
                    <span>{cls.studentCount} Students</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href={`/teacher/attendance/${cls.id}`}
                    className={`inline-flex items-center justify-center text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${
                      cls.isMarked
                        ? "bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.08]"
                        : "bg-blue-600 text-white hover:bg-blue-500 border-blue-600/20"
                    }`}
                  >
                    {cls.isMarked ? "Edit Attendance" : "Mark Attendance"}
                  </Link>

                  <Link
                    href={`/teacher/attendance/history?classId=${cls.id}`}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    <History className="size-3.5" />
                    View History
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
