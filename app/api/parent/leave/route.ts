import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { studentId, reason, fromDate, toDate } = await req.json();

    if (!studentId || !reason || !fromDate || !toDate) {
      return errorResponse("Missing required fields", 400);
    }

    // 1. Verify student is linked to this parent user
    const parentRelation = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parentRelation) {
      return errorResponse("You do not have permission", 403);
    }

    // 2. Fetch student and class details
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    if (!student) {
      return errorResponse("Record not found", 404);
    }

    // 3. Resolve Class Teacher
    let teacherId: string = "teacher-profile-id";
    if (student.class?.classTeacherId) {
      teacherId = student.class.classTeacherId;
    } else if (student.classId) {
      // Find a teacher associated with subjects in this class
      const classSubject = await db.classSubject.findFirst({
        where: { classId: student.classId },
        select: { teacherId: true },
      });
      if (classSubject?.teacherId) {
        teacherId = classSubject.teacherId;
      }
    }

    if (teacherId === "teacher-profile-id") {
      // Fallback to any teacher in the same school
      const schoolTeacher = await db.teacher.findFirst({
        where: { schoolId: student.schoolId },
        select: { id: true },
      });
      if (schoolTeacher?.id) {
        teacherId = schoolTeacher.id;
      }
    }

    // 4. Create the LeaveRequest record
    const leaveRequest = await db.leaveRequest.create({
      data: {
        studentId,
        teacherId,
        reason,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        status: "PENDING",
      },
    });

    // 5. Notify the Class Teacher's User Account
    const teacherProfile = await db.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (teacherProfile?.user?.id) {
      const fromDateString = new Date(fromDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const toDateString = new Date(toDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      await db.notification.create({
        data: {
          userId: teacherProfile.user.id,
          schoolId: student.schoolId,
          title: "New Leave Application",
          content: `${student.name}'s parent has applied for leave from ${fromDateString} to ${toDateString}. Reason: ${reason}`,
          type: "GENERAL",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: leaveRequest,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_LEAVE_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
