import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { parentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacherUserId = session.user.id;
    const { parentId } = params; // This represents the parent's user.id

    // Fetch message history between these two users
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: teacherUserId, receiverId: parentId },
          { senderId: parentId, receiverId: teacherUserId },
        ],
      },
      orderBy: { createdAt: "asc" }, // Thread oldest first
    });

    // Mark any unread messages from this parent as read
    const unreadMessages = messages.filter(
      (m: any) => m.senderId === parentId && m.receiverId === teacherUserId && !m.isRead
    );

    if (unreadMessages.length > 0) {
      await db.message.updateMany({
        where: {
          id: { in: unreadMessages.map((m: any) => m.id) },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_THREAD_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
