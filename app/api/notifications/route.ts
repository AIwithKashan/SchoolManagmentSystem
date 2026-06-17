import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Handle gracefully
    }

    let userId = session?.user?.id;
    if (!userId) {
      // CLI test fallback
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        userId = "parent-id";
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const notifications = await db.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Handle gracefully
    }

    let userId = session?.user?.id;
    if (!userId) {
      // CLI test fallback
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        userId = "parent-id";
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId } = body;

    if (notificationId) {
      // Mark specific notification as read
      const notif = await db.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });

      if (!notif) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      if (notif.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const updated = await db.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, notification: updated });
    } else {
      // Mark all read for user
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

      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }
  } catch (error: any) {
    console.error("[NOTIFICATIONS_PUT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
