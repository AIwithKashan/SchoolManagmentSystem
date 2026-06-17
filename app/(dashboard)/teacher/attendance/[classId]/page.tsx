import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import AttendanceForm from "@/components/dashboard/AttendanceForm";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function TeacherAttendanceMarkingPage({
  params,
}: {
  params: { classId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const { classId } = params;

  // 1. Fetch Class info
  const targetClass = await db.class.findUnique({
    where: { id: classId },
  });

  if (!targetClass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="size-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Class Not Found</h2>
        <p className="text-gray-400 text-sm max-w-md">
          The requested class does not exist or has been deleted.
        </p>
      </div>
    );
  }

  // 2. Fetch Students in Class
  const students = await db.student.findMany({
    where: {
      classId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      photo: true,
    },
    orderBy: {
      rollNumber: "asc",
    },
  });

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="size-12 text-yellow-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Active Students</h2>
        <p className="text-gray-400 text-sm max-w-md">
          There are no active students enrolled in {targetClass.name} {targetClass.section} to mark attendance for.
        </p>
      </div>
    );
  }

  // 3. Fetch today's existing attendance (if any)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const initialAttendance = await db.attendance.findMany({
    where: {
      classId,
      date: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    select: {
      studentId: true,
      status: true,
      note: true,
    },
  });

  return (
    <div className="space-y-6 pb-8">
      <AttendanceForm
        classId={classId}
        className={`${targetClass.name} - ${targetClass.section}`}
        students={students}
        initialAttendance={initialAttendance}
      />
    </div>
  );
}
