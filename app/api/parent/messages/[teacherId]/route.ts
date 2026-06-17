import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const parentUserId = session.user.id;
    const { teacherId } = params; // Teacher's User.id

    // Fetch conversation thread
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: parentUserId, receiverId: teacherId },
          { senderId: teacherId, receiverId: parentUserId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages sent by the teacher to the parent as read
    const unreadMessages = messages.filter(
      (m: any) => m.senderId === teacherId && m.receiverId === parentUserId && !m.isRead
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
    console.error('[API_ERROR] [PARENT_CHAT_HISTORY_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
