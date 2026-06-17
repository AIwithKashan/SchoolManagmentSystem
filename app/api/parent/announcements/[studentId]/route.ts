import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { studentId } = params;

    // Verify parent has access to this student
    const parentRecord = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
      include: {
        student: {
          select: {
            classId: true,
            schoolId: true,
          },
        },
      },
    });

    if (!parentRecord) {
      return errorResponse("You do not have permission", 403);
    }

    const student = parentRecord.student;
    if (!student) {
      return errorResponse("Record not found", 404);
    }

    // Fetch active announcements for the school targeting ALL or PARENT
    const announcements = await db.announcement.findMany({
      where: {
        schoolId: student.schoolId,
        isActive: true,
        targetRole: { in: ["ALL", "PARENT"] },
      },
      include: {
        createdBy: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedAnnouncements: any[] = [];

    announcements.forEach((ann) => {
      let displayContent = ann.content;
      let targetClassId: string | null = null;

      // Check for JSON metadata prefix
      if (ann.content.trim().startsWith("{")) {
        const dividerIdx = ann.content.indexOf("|CONTENT|");
        if (dividerIdx !== -1) {
          try {
            const metadataStr = ann.content.substring(0, dividerIdx).trim();
            const metadata = JSON.parse(metadataStr);
            targetClassId = metadata.classId;
            displayContent = ann.content.substring(dividerIdx + 9).trim();
          } catch (e) {
    console.error('[API_ERROR] Failed to parse announcement metadata', e);
    return errorResponse("Server error. Please try again.", 500);
  }
        }
      }

      // Filter logic:
      // If the announcement has a targetClassId, it belongs to a class.
      // We only include it if it matches this student's classId.
      if (targetClassId) {
        if (targetClassId === student.classId) {
          parsedAnnouncements.push({
            id: ann.id,
            title: ann.title,
            content: displayContent,
            createdAt: ann.createdAt,
            creatorName: ann.createdBy?.name || "School Administration",
            creatorAvatar: ann.createdBy?.avatar || null,
            targetRole: ann.targetRole,
            type: "class",
          });
        }
      } else {
        // School-wide announcement (no classId constraint)
        parsedAnnouncements.push({
          id: ann.id,
          title: ann.title,
          content: displayContent,
          createdAt: ann.createdAt,
          creatorName: ann.createdBy?.name || "School Administration",
          creatorAvatar: ann.createdBy?.avatar || null,
          targetRole: ann.targetRole,
          type: "school",
        });
      }
    });

    return NextResponse.json(parsedAnnouncements);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_ANNOUNCEMENTS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
