import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ParentProfileClient from "./ParentProfileClient";

export default async function ParentProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  return (
    <ParentProfileClient />
  );
}
