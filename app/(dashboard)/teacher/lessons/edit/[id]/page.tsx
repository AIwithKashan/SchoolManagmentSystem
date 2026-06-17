import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import EditLessonPlanClient from "./EditLessonPlanClient";

interface EditLessonPlanPageProps {
  params: {
    id: string;
  };
}

export default async function EditLessonPlanPage({ params }: EditLessonPlanPageProps) {
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

  const lessonPlan = await db.lessonPlan.findUnique({
    where: { id: params.id },
  });

  if (!lessonPlan || lessonPlan.teacherId !== teacher.id) {
    notFound();
  }

  // Fetch class-subjects to display class/subject choices in edits
  const classSubjects = await db.classSubject.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  const dropdownData = classSubjects.map((cs) => ({
    classId: cs.class.id,
    className: `${cs.class.name} ${cs.class.section}`,
    subjectId: cs.subject.id,
    subjectName: cs.subject.name,
  }));

  // Format content object
  const formattedPlan = {
    id: lessonPlan.id,
    title: lessonPlan.title,
    subject: lessonPlan.subject,
    classId: lessonPlan.classId,
    topic: lessonPlan.topic,
    duration: lessonPlan.duration.toString(),
    content: lessonPlan.content as any,
    isAIGenerated: lessonPlan.isAIGenerated,
  };

  return (
    <div className="space-y-6 pb-8">
      <EditLessonPlanClient lessonPlan={formattedPlan} classSubjects={dropdownData} />
    </div>
  );
}
