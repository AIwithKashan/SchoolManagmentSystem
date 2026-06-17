import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import AssignmentsListClient from "./AssignmentsListClient";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function TeacherAssignmentsPage() {
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

  // 1. Fetch all assignments for this teacher
  // We can query this on the server
  const assignments = await db.assignment.findMany({
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
      subject: { select: { name: true } },
      submissions: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich assignments
  const enrichedAssignments = assignments.map((assign) => {
    const studentCount = assign.class.students.length;
    const submissionCount = assign.submissions.length;
    const gradedCount = assign.submissions.filter((s) => s.status === "GRADED").length;

    return {
      id: assign.id,
      title: assign.title,
      description: assign.description,
      dueDate: assign.dueDate.toISOString(),
      totalMarks: assign.totalMarks,
      attachmentUrl: assign.attachmentUrl,
      isActive: assign.isActive,
      className: `${assign.class.name} ${assign.class.section}`,
      classId: assign.class.id,
      subjectName: assign.subject.name,
      studentCount,
      submissionCount,
      gradedCount,
    };
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Assignments</h1>
          <p className="text-gray-400 text-sm mt-1">
            Create homework assignments, track submission percentages, and record grades.
          </p>
        </div>
        
        <Link
          href="/teacher/assignments/new"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 border border-blue-600/20 shadow-lg shadow-blue-500/10 transition-all shrink-0"
        >
          <PlusCircle className="size-4" />
          Create Assignment
        </Link>
      </div>

      <AssignmentsListClient initialAssignments={enrichedAssignments} />
    </div>
  );
}
