import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import StudentAssignmentClient from "./StudentAssignmentClient";

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    childId?: string;
  };
}

export default async function StudentAssignmentPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const { id } = params;
  const cookieStore = cookies();
  const studentId = searchParams.childId || cookieStore.get("selected_child_id")?.value;

  if (!studentId) {
    redirect("/parent/student-corner");
  }

  // Verify parent has access to this student
  const parent = await db.parent.findFirst({
    where: {
      userId: session.user.id,
      studentId: studentId,
    },
    include: {
      student: { select: { name: true } },
    },
  });

  if (!parent) {
    redirect("/parent/student-corner");
  }

  return (
    <StudentAssignmentClient
      assignmentId={id}
      studentId={studentId}
      studentName={parent.student.name}
    />
  );
}
