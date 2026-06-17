import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSchoolInfo } from "@/lib/db-queries";
import DashboardLayoutClient from "@/components/dashboard/DashboardLayoutClient";
import NextAuthSessionProvider from "@/components/SessionProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    schoolId: session.user.schoolId,
    avatar: session.user.avatar,
  };

  let schoolName = "Al-Noor School";
  if (user.schoolId) {
    try {
      const school = await getSchoolInfo(user.schoolId);
      if (school?.name) {
        schoolName = school.name;
      }
    } catch {
      console.warn("Could not query school name, using fallback default.");
    }
  }

  return (
    <NextAuthSessionProvider>
      <DashboardLayoutClient
        userName={user.name ?? "User"}
        userRole={user.role as "PRINCIPAL" | "TEACHER" | "PARENT"}
        userAvatar={user.avatar}
        schoolName={schoolName}
        user={user}
      >
        {children}
      </DashboardLayoutClient>
    </NextAuthSessionProvider>
  );
}

