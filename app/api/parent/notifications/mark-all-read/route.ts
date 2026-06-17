import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.userId || session.user.id;

    if (userId !== session.user.id) {
      return errorResponse("You do not have permission", 403);
    }

    await db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_NOTIFICATIONS_MARK_ALL_READ_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
