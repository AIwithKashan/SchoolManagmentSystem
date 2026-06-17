import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TargetRole } from "@prisma/client";

// PUT /api/principal/announcements/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const announcementId = params.id;

    // Check announcement exists and belongs to school
    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, schoolId },
    });

    if (!announcement) {
      return errorResponse("Record not found", 404);
    }

    const body = await req.json();
    const { title, content, targetRole, isActive } = body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content.trim();
    if (targetRole !== undefined) data.targetRole = targetRole as TargetRole;
    if (isActive !== undefined) data.isActive = !!isActive;

    const updated = await db.announcement.update({
      where: { id: announcementId },
      data,
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

    return NextResponse.json({ success: true, announcement: updated });
  } catch (error) {
    console.error('[API_ERROR] [ANNOUNCEMENT_PUT]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// DELETE /api/principal/announcements/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const announcementId = params.id;

    // Check announcement exists and belongs to school
    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, schoolId },
    });

    if (!announcement) {
      return errorResponse("Record not found", 404);
    }

    await db.announcement.delete({
      where: { id: announcementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [ANNOUNCEMENT_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
