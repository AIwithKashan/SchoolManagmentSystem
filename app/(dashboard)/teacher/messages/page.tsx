import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import MessagesClient from "./MessagesClient";

export default async function TeacherMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherUserId = session.user.id;

  // 1. Fetch teacher profile
  const teacher = await db.teacher.findUnique({
    where: { userId: teacherUserId },
  });

  if (!teacher) {
    redirect("/login");
  }

  // 2. Fetch conversations
  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: teacherUserId },
        { receiverId: teacherUserId },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const conversationMap = new Map<string, any[]>();
  messages.forEach((msg) => {
    const otherUserId = msg.senderId === teacherUserId ? msg.receiverId : msg.senderId;
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, []);
    }
    conversationMap.get(otherUserId)!.push(msg);
  });

  const conversations: any[] = [];
  const conversationEntries = Array.from(conversationMap.entries());
  for (let i = 0; i < conversationEntries.length; i++) {
    const parentId = conversationEntries[i][0];
    const msgs = conversationEntries[i][1];
    const lastMsg = msgs[0];
    const unreadCount = msgs.filter(
      (m: any) => m.receiverId === teacherUserId && !m.isRead
    ).length;

    const parentUser = await db.user.findUnique({
      where: { id: parentId },
      select: { name: true, avatar: true },
    });

    const parentProfile = await db.parent.findUnique({
      where: { userId: parentId },
      include: {
        student: { select: { name: true } },
      },
    });

    conversations.push({
      parentId,
      parentName: parentUser?.name || "Parent User",
      parentAvatar: parentUser?.avatar || null,
      studentName: parentProfile?.student?.name || "Student",
      lastMessage: lastMsg.content,
      lastMessageTime: lastMsg.createdAt.toISOString(),
      unreadCount,
    });
  }

  conversations.sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  // 3. Fetch list of all potential parents taught by this teacher for autocomplete dialog
  const classSubjects = await db.classSubject.findMany({
    where: { teacherId: teacher.id },
    select: { classId: true },
  });
  const classIds = Array.from(new Set(classSubjects.map((cs) => cs.classId)));

  const students = await db.student.findMany({
    where: { classId: { in: classIds }, isActive: true },
    select: { id: true, name: true },
  });
  const studentIds = students.map((s) => s.id);

  const parents = await db.parent.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      student: { select: { name: true } },
    },
  });

  const parentList = parents.map((p) => ({
    parentUserId: p.user.id,
    parentName: p.user.name,
    parentPhone: p.user.phone || "No phone added",
    studentName: p.student.name,
  }));

  // De-duplicate parent list
  const uniqueParents: any[] = [];
  const seenIds = new Set();
  for (const p of parentList) {
    if (!seenIds.has(p.parentUserId)) {
      seenIds.add(p.parentUserId);
      uniqueParents.push(p);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MessagesClient
        initialConversations={conversations}
        teacherUserId={teacherUserId}
        parentsAutocomplete={uniqueParents}
      />
    </div>
  );
}
