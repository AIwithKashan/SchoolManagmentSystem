import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import EditAssignmentClient from "./EditAssignmentClient";

interface EditAssignmentPageProps {
  params: {
    id: string;
  };
}

export default async function EditAssignmentPage({ params }: EditAssignmentPageProps) {
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

  const assignment = await db.assignment.findUnique({
    where: { id: params.id },
    include: {
      class: { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  if (!assignment || assignment.teacherId !== teacher.id) {
    notFound();
  }

  // Format date to local datetime string for input field
  const localDueDate = new Date(assignment.dueDate)
    .toISOString()
    .slice(0, 16); // format: "YYYY-MM-DDTHH:MM"

  const formattedAssignment = {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description || "",
    dueDate: localDueDate,
    totalMarks: assignment.totalMarks.toString(),
    attachmentUrl: assignment.attachmentUrl,
    isActive: assignment.isActive,
    className: `${assignment.class.name} ${assignment.class.section}`,
    subjectName: assignment.subject.name,
  };

  return (
    <div className="space-y-6 pb-8">
      <EditAssignmentClient assignment={formattedAssignment} />
    </div>
  );
}
