import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ParentSettingsClient from "./ParentSettingsClient";

export default async function ParentSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  return (
    <ParentSettingsClient />
  );
}
