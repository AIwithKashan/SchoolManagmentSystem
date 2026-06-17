import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import CreateAssignmentClient from "./CreateAssignmentClient";

export default async function TeacherCreateAssignmentPage() {
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

  // Fetch all class-subjects assigned to this teacher to populate dropdowns
  const classSubjects = await db.classSubject.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  // Extract distinct classes and subjects mapping
  const dropdownData = classSubjects.map((cs) => ({
    classId: cs.class.id,
    className: `${cs.class.name} ${cs.class.section}`,
    subjectId: cs.subject.id,
    subjectName: cs.subject.name,
  }));

  return (
    <div className="space-y-6 pb-8">
      <CreateAssignmentClient classSubjects={dropdownData} />
    </div>
  );
}
