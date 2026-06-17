import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ParentNotificationsClient from "./ParentNotificationsClient";

export default async function ParentNotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  return (
    <ParentNotificationsClient
      userId={session.user.id}
    />
  );
}
