import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import AssignmentSubmissionsClient from "./AssignmentSubmissionsClient";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function TeacherAssignmentSubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const { id } = params;

  // 1. Fetch Assignment details
  const assignment = await db.assignment.findUnique({
    where: { id },
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true } },
    },
  });

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertTriangle className="size-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Assignment Not Found</h2>
        <p className="text-gray-400 text-sm max-w-md">
          The requested assignment details do not exist or have been deleted.
        </p>
      </div>
    );
  }

  // 2. Fetch all student submissions
  const submissions = await db.submission.findMany({
    where: { assignmentId: id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          rollNumber: true,
          photo: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // 3. Fetch all active students in that class
  const classStudents = await db.student.findMany({
    where: {
      classId: assignment.classId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      photo: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  // 4. Calculate unsubmitted student records
  const submittedStudentIds = new Set(submissions.map((s) => s.studentId));
  const notSubmitted = classStudents.filter((s) => !submittedStudentIds.has(s.id));

  // Serialize models safely
  const serializedAssignment = {
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate.toISOString(),
    totalMarks: assignment.totalMarks,
    className: `${assignment.class.name} ${assignment.class.section}`,
    subjectName: assignment.subject.name,
  };

  const serializedSubmissions = submissions.map((sub) => ({
    id: sub.id,
    assignmentId: sub.assignmentId,
    studentId: sub.studentId,
    content: sub.content,
    attachmentUrl: sub.attachmentUrl,
    submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
    aiScore: sub.aiScore,
    teacherScore: sub.teacherScore,
    aiFeedback: sub.aiFeedback,
    teacherFeedback: sub.teacherFeedback,
    status: sub.status,
    student: sub.student,
  }));

  const serializedNotSubmitted = notSubmitted.map((student) => ({
    id: student.id,
    name: student.name,
    rollNumber: student.rollNumber,
    photo: student.photo,
  }));

  return (
    <div className="space-y-6 pb-8">
      <AssignmentSubmissionsClient
        assignment={serializedAssignment}
        initialSubmissions={serializedSubmissions}
        initialNotSubmitted={serializedNotSubmitted}
      />
    </div>
  );
}
