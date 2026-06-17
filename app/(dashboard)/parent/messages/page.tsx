import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ParentMessagesClient from "./ParentMessagesClient";

export default async function ParentMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch parent and associated school phone number for the Call button
  const parents = await db.parent.findMany({
    where: { userId },
    include: {
      school: {
        select: {
          phone: true,
          name: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          classId: true,
        },
      },
    },
  });

  if (parents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white p-6 glass-card rounded-2xl max-w-xl mx-auto mt-12 border-white/[0.08]">
        <h3 className="text-xl font-bold text-rose-400">Account Configuration Error</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          No students are currently linked to your parent account. Please contact the school administration.
        </p>
      </div>
    );
  }

  const schoolPhone = parents[0].school.phone || "021-111-338-646"; // default school number if empty
  const schoolName = parents[0].school.name || "School Office";

  return (
    <ParentMessagesClient
      schoolPhone={schoolPhone}
      schoolName={schoolName}
    />
  );
}
