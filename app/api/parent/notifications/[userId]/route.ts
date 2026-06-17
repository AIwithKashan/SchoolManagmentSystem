import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { userId } = params;

    // Secure check: verify they are only requesting their own notifications
    if (session.user.id !== userId) {
      return errorResponse("You do not have permission", 403);
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({
        where: { userId },
      }),
    ]);

    return new Response(
      JSON.stringify({
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_NOTIFICATIONS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
