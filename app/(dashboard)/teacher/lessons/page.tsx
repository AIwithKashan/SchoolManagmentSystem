import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import LessonsListClient from "./LessonsListClient";

export default async function TeacherLessonsPage() {
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

  const lessonPlans = await db.lessonPlan.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
  });

  const classIds = Array.from(new Set(lessonPlans.map((lp: any) => lp.classId))) as string[];
  const classes = await db.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true, section: true },
  });

  const classMap = new Map(classes.map((c: any) => [c.id, `${c.name} ${c.section}`]));

  const enrichedLessons = lessonPlans.map((lp: any) => ({
    id: lp.id,
    title: lp.title,
    subject: lp.subject,
    classId: lp.classId,
    className: classMap.get(lp.classId) || "Unknown Class",
    topic: lp.topic,
    duration: lp.duration,
    content: lp.content as any,
    isAIGenerated: lp.isAIGenerated,
    createdAt: lp.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 pb-8">
      <LessonsListClient initialLessons={enrichedLessons} />
    </div>
  );
}
