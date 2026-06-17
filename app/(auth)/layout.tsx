import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const role = session.user.role;
    if (role === Role.PRINCIPAL) {
      redirect("/principal/dashboard");
    } else if (role === Role.TEACHER) {
      redirect("/teacher/dashboard");
    } else if (role === Role.PARENT) {
      redirect("/parent/dashboard");
    } else if (role === Role.SUPER_ADMIN) {
      redirect("/admin/dashboard");
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#050B1A] overflow-hidden">
      {/* Background animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-950/20 blur-[130px] animate-pulse duration-[8000ms]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-950/20 blur-[130px] animate-pulse duration-[10000ms]" />
        <div className="absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full bg-indigo-950/15 blur-[120px] animate-pulse duration-[6000ms]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-[420px] p-4 flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
