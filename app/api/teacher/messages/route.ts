import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacherUserId = session.user.id;

    // Fetch teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    const url = new URL(req.url);
    const fetchParents = url.searchParams.get("parents") === "true";

    // Subroute: Fetch all unique parents of students in the teacher's classes (for new message dialog)
    if (fetchParents) {
      // 1. Get teacher's assigned classes
      const classSubjects = await db.classSubject.findMany({
        where: { teacherId: teacher.id },
        select: { classId: true },
      });
      const classIds = Array.from(new Set(classSubjects.map((cs) => cs.classId)));

      // 2. Get students in these classes
      const students = await db.student.findMany({
        where: { classId: { in: classIds }, isActive: true },
        select: { id: true, name: true },
      });
      const studentIds = students.map((s) => s.id);

      // 3. Get parents linked to these students
      const parents = await db.parent.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          userId: true,
          user: { select: { id: true, name: true, avatar: true } },
          student: { select: { name: true } },
        },
      });

      const parentList = parents.map((p) => ({
        parentUserId: p.user.id,
        parentName: p.user.name,
        parentPhone: "",
        parentAvatar: p.user.avatar || null,
        studentName: p.student.name,
      }));

      // De-duplicate parent list by parentUserId
      const uniqueParents = [];
      const seenIds = new Set();
      for (const p of parentList) {
        if (!seenIds.has(p.parentUserId)) {
          seenIds.add(p.parentUserId);
          uniqueParents.push(p);
        }
      }

      return NextResponse.json(uniqueParents);
    }

    // Default route: Fetch all conversations involving the teacher
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: teacherUserId },
          { receiverId: teacherUserId },
        ],
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group messages by the "other user" (parent)
    const conversationMap = new Map<string, any[]>();
    messages.forEach((msg: any) => {
      const otherUserId = msg.senderId === teacherUserId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, []);
      }
      conversationMap.get(otherUserId)!.push(msg);
    });

    // Batch-load all parent users in one query
    const parentIds = Array.from(conversationMap.keys());
    const [parentUsers, parentProfiles] = await Promise.all([
      db.user.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, name: true, avatar: true },
      }),
      db.parent.findMany({
        where: { userId: { in: parentIds } },
        select: {
          userId: true,
          student: { select: { name: true } },
        },
      }),
    ]);
    const parentUserMap = new Map(parentUsers.map((u) => [u.id, u]));
    const parentProfileMap = new Map(parentProfiles.map((p) => [p.userId, p]));

    const conversations: any[] = [];
    const conversationEntries = Array.from(conversationMap.entries());

    // For each parent (other user), build conversation summary
    for (let i = 0; i < conversationEntries.length; i++) {
      const parentId = conversationEntries[i][0];
      const msgs = conversationEntries[i][1];
      const lastMsg = msgs[0]; // messages are sorted latest first
      const unreadCount = msgs.filter(
        (m: any) => m.receiverId === teacherUserId && !m.isRead
      ).length;

      const parentUser = parentUserMap.get(parentId);
      const parentProfile = parentProfileMap.get(parentId);

      conversations.push({
        parentId,
        parentName: parentUser?.name || "Parent User",
        parentAvatar: parentUser?.avatar || null,
        studentName: parentProfile?.student?.name || "Student",
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.createdAt,
        unreadCount,
      });
    }

    // Sort conversations by latest message timestamp
    conversations.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_MESSAGES_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacherUserId = session.user.id;
    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return errorResponse("Missing required fields", 400);
    }

    // Fetch teacher profile to get schoolId
    const teacher = await db.teacher.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    // Create the message
    const message = await db.message.create({
      data: {
        senderId: teacherUserId,
        receiverId,
        schoolId: teacher.schoolId,
        content,
        isRead: false,
      },
    });

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_MESSAGE_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
