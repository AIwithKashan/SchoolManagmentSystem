import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const parentUserId = session.user.id;

    // Fetch parent profile and linked students
    const parents = await db.parent.findMany({
      where: { userId: parentUserId },
      select: {
        studentId: true,
        student: {
          select: {
            name: true,
            classId: true,
            class: { select: { id: true } },
          },
        },
      },
    });

    if (parents.length === 0) {
      return errorResponse("Record not found", 404);
    }

    const linkedStudentIds = parents.map((p) => p.studentId);
    const linkedClassIds = parents.map((p) => p.student.classId).filter(Boolean) as string[];

    const url = new URL(req.url);
    const fetchTeachers = url.searchParams.get("teachers") === "true";

    // Subroute: Fetch all eligible teachers parent can message (teachers of their child/children)
    if (fetchTeachers) {
      const classSubjects = await db.classSubject.findMany({
        where: { classId: { in: linkedClassIds } },
        select: {
          classId: true,
          teacher: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          subject: { select: { name: true } },
          class: { select: { id: true, name: true, section: true } },
        },
      });

      const teacherList = classSubjects
        .filter((cs) => cs.teacher?.user)
        .map((cs) => {
          // Find which of the parent's children is in this class
          const matchingParentRecord = parents.find((p) => p.student.classId === cs.classId);
          return {
            teacherUserId: cs.teacher!.user.id,
            teacherName: cs.teacher!.user.name,
            teacherAvatar: cs.teacher!.user.avatar || null,
            subjectName: cs.subject.name,
            studentName: matchingParentRecord?.student.name || "Child",
            className: `${cs.class.name}-${cs.class.section}`,
          };
        });

      // De-duplicate by teacherUserId + subjectName to avoid repeats
      const uniqueTeachers: any[] = [];
      const seenKeys = new Set();
      for (const t of teacherList) {
        const key = `${t.teacherUserId}-${t.subjectName}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueTeachers.push(t);
        }
      }

      return NextResponse.json(uniqueTeachers);
    }

    // Default route: Fetch all conversations involving the parent
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: parentUserId },
          { receiverId: parentUserId },
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

    // Group messages by the teacher's User.id
    const conversationMap = new Map<string, any[]>();
    messages.forEach((msg: any) => {
      const otherUserId = msg.senderId === parentUserId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, []);
      }
      conversationMap.get(otherUserId)!.push(msg);
    });

    // Batch-load all teacher users and profiles in one pair of queries
    const teacherIds = Array.from(conversationMap.keys());
    const [teacherUsers, teacherProfiles] = await Promise.all([
      db.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, name: true, avatar: true },
      }),
      db.teacher.findMany({
        where: { userId: { in: teacherIds } },
        select: {
          userId: true,
          classSubjects: {
            where: { classId: { in: linkedClassIds } },
            select: {
              classId: true,
              subject: { select: { name: true } },
            },
            take: 1,
          },
        },
      }),
    ]);
    const teacherUserMap = new Map(teacherUsers.map((u) => [u.id, u]));
    const teacherProfileMap = new Map(teacherProfiles.map((t) => [t.userId, t]));

    const conversations: any[] = [];
    const conversationEntries = Array.from(conversationMap.entries());

    for (let i = 0; i < conversationEntries.length; i++) {
      const teacherUserId = conversationEntries[i][0];
      const msgs = conversationEntries[i][1];
      const lastMsg = msgs[0];
      const unreadCount = msgs.filter(
        (m: any) => m.receiverId === parentUserId && !m.isRead
      ).length;

      const teacherUser = teacherUserMap.get(teacherUserId);
      const teacherProfile = teacherProfileMap.get(teacherUserId);

      // Find which child is linked to this teacher (by matching classes)
      let studentName = "Child";
      let subjectName = "Teacher";

      if (teacherProfile && teacherProfile.classSubjects.length > 0) {
        const firstMatch = teacherProfile.classSubjects[0];
        subjectName = firstMatch.subject.name;
        const matchingParentRecord = parents.find((p) => p.student.classId === firstMatch.classId);
        studentName = matchingParentRecord?.student.name || "Child";
      }

      conversations.push({
        teacherUserId,
        teacherName: teacherUser?.name || "Teacher",
        teacherAvatar: teacherUser?.avatar || null,
        subjectName,
        studentName,
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.createdAt,
        unreadCount,
      });
    }

    conversations.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_MESSAGES_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const parentUserId = session.user.id;
    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return errorResponse("Missing required fields", 400);
    }

    // Get parent's schoolId to associate with message
    const parentProfile = await db.parent.findFirst({
      where: { userId: parentUserId },
      select: { schoolId: true },
    });

    if (!parentProfile) {
      return errorResponse("Record not found", 404);
    }

    const message = await db.message.create({
      data: {
        senderId: parentUserId,
        receiverId,
        schoolId: parentProfile.schoolId,
        content,
        isRead: false,
      },
    });

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_MESSAGE_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
