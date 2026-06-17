import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TargetRole, NotificationType } from "@prisma/client";

// GET /api/principal/announcements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") ?? "";
    const targetRole = searchParams.get("targetRole") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(targetRole && targetRole !== "all" && { targetRole: targetRole as TargetRole }),
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    };

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.announcement.count({ where }),
    ]);

    // Summary counts for stats ribbon
    const [totalCount, activeCount, teacherTargetCount, parentTargetCount] = await Promise.all([
      db.announcement.count({ where: { schoolId } }),
      db.announcement.count({ where: { schoolId, isActive: true } }),
      db.announcement.count({ where: { schoolId, targetRole: TargetRole.TEACHER } }),
      db.announcement.count({ where: { schoolId, targetRole: TargetRole.PARENT } }),
    ]);

    return NextResponse.json({
      announcements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: totalCount,
        active: activeCount,
        teacherTargets: teacherTargetCount,
        parentTargets: parentTargetCount,
      },
    });
  } catch (error) {
    console.error('[API_ERROR] [ANNOUNCEMENTS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST /api/principal/announcements
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const createdById = session.user.id;
    const body = await req.json();

    const { title, content, targetAudience, classId, scheduledAt, isActive } = body;

    if (!title?.trim() || !content?.trim() || !targetAudience) {
      return errorResponse("Title, content, and targetAudience are required fields", 400);
    }

    if (title.length > 100) {
      return errorResponse("Title must be 100 characters or less", 400);
    }

    // Determine targetRole enum value based on audience selection
    let targetRole: TargetRole = TargetRole.ALL;
    if (targetAudience === "TEACHERS") {
      targetRole = TargetRole.TEACHER;
    } else if (targetAudience === "PARENTS" || targetAudience === "CLASS") {
      targetRole = TargetRole.PARENT;
    }

    // Serialize metadata (classId and scheduledAt) inside the content body using unique prefix
    let dbContent = content.trim();
    if (classId || scheduledAt) {
      const metadata = {
        classId: classId || null,
        scheduledAt: scheduledAt || null,
      };
      dbContent = `${JSON.stringify(metadata)} |CONTENT| ${content.trim()}`;
    }

    // Create Announcement in DB
    const announcement = await db.announcement.create({
      data: {
        title: title.trim(),
        content: dbContent,
        targetRole,
        isActive: isActive !== undefined ? !!isActive : true,
        schoolId,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Dispatch smart notifications trigger for new announcement
    try {
      const origin = new URL(req.url).origin;
      fetch(`${origin}/api/ai/notifications/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: "NEW_ANNOUNCEMENT",
          data: {
            announcementId: announcement.id,
          },
          schoolId,
        }),
      }).catch((err) => console.error("Error calling announcement trigger:", err));
    } catch (err) {
    console.error('[API_ERROR] Error setting up announcement trigger:', err);
    return errorResponse("Server error. Please try again.", 500);
  }

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error('[API_ERROR] [ANNOUNCEMENTS_POST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
