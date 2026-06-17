import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import AttendanceHistoryClient from "./AttendanceHistoryClient";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function TeacherAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: { classId?: string };
}) {
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

  // 1. Fetch all assigned classes
  const classSubjects = await db.classSubject.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: true,
    },
  });

  // Process distinct classes
  const classesMap = new Map<string, string>();
  classSubjects.forEach((cs) => {
    if (cs.class) {
      classesMap.set(cs.class.id, `${cs.class.name} ${cs.class.section}`);
    }
  });

  const assignedClasses = Array.from(classesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  if (assignedClasses.length === 0) {
    return (
      <div className="p-6">
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-8 text-center rounded-xl">
          <AlertTriangle className="size-10 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-white font-bold text-base">No Classes Assigned</h2>
          <p className="text-gray-400 text-sm mt-1">
            You do not have any assigned classes to view history logs.
          </p>
        </Card>
      </div>
    );
  }

  // Selected class
  const classId = searchParams.classId || assignedClasses[0].id;

  return (
    <div className="space-y-6 pb-8">
      <AttendanceHistoryClient
        classId={classId}
        assignedClasses={assignedClasses}
      />
    </div>
  );
}
