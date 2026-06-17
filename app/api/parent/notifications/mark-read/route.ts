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

    const { notificationId } = await req.json();

    if (!notificationId) {
      return errorResponse("Missing notificationId", 400);
    }

    // Verify notification belongs to session user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notification) {
      return errorResponse("Record not found", 404);
    }

    if (notification.userId !== session.user.id) {
      return errorResponse("You do not have permission", 403);
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_NOTIFICATIONS_MARK_READ_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
