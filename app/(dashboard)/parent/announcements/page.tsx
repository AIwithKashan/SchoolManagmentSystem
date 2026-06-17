import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ParentAnnouncementsClient from "./ParentAnnouncementsClient";

export default async function ParentAnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch children list to pass to client component for selector filters
  const parents = await db.parent.findMany({
    where: { userId },
    include: {
      student: {
        include: {
          class: true,
        },
      },
    },
  });

  if (parents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white p-6 glass-card rounded-2xl max-w-xl mx-auto mt-12 border-white/[0.08]">
        <h3 className="text-xl font-bold text-rose-400">Account Configuration Error</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          No students are linked to your parent account. Please contact school administration.
        </p>
      </div>
    );
  }

  const childrenInfo = parents.map((p) => ({
    id: p.student.id,
    name: p.student.name,
    className: p.student.class?.name || "Grade N/A",
    section: p.student.class?.section || "N/A",
    photo: p.student.photo,
  }));

  return (
    <ParentAnnouncementsClient
      childrenList={childrenInfo}
    />
  );
}
