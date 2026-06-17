import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ParentAttendanceClient from "./ParentAttendanceClient";

interface PageProps {
  searchParams: {
    childId?: string;
  };
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch parent profiles linking to child students
  const parents = await db.parent.findMany({
    where: { userId },
    include: {
      student: {
        include: {
          class: {
            include: {
              school: true,
            },
          },
        },
      },
    },
  });

  if (parents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white p-6 glass-card rounded-2xl max-w-xl mx-auto mt-12 border-white/[0.08]">
        <h3 className="text-xl font-bold text-rose-400">No Student Linked</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          No students are currently linked to your parent account. Please contact the school administration to link your child.
        </p>
      </div>
    );
  }

  // 2. Resolve active student selection
  const cookieStore = cookies();
  const activeStudentId = searchParams.childId || cookieStore.get("selected_child_id")?.value || parents[0].studentId;
  const activeParentRecord = parents.find((p) => p.studentId === activeStudentId) || parents[0];
  const activeStudent = activeParentRecord.student;

  // Map student info
  const studentsInfo = parents.map((p) => ({
    id: p.student.id,
    name: p.student.name,
    rollNumber: p.student.rollNumber,
    className: p.student.class?.name || "Grade N/A",
    section: p.student.class?.section || "N/A",
    photo: p.student.photo,
    schoolName: p.student.class?.school?.name || "Al-Noor School",
  }));

  return (
    <ParentAttendanceClient
      students={studentsInfo}
      activeStudentId={activeStudent.id}
    />
  );
}
