import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  handleAttendanceMarked,
  handleLateSubmission,
  handleGradeBelowPassing,
  handleFeeOverdue,
  handleNewAnnouncement,
  handleExamScheduled,
} from "@/lib/ai/smart-notifications";

export async function POST(req: Request) {
  try {
    let isAuthorized = false;
    let session = null;

    try {
      session = await getServerSession(authOptions);
      if (session?.user) {
        isAuthorized = true;
      }
    } catch (e) {
      // CLI test fallback
    }

    const isDev = process.env.NODE_ENV === "development";
    const body = await req.json().catch(() => ({}));
    const { triggerType, data, schoolId } = body;

    // Development bypass
    if (!isAuthorized && isDev && schoolId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Session missing" }, { status: 401 });
    }

    if (!triggerType || !data || !schoolId) {
      return NextResponse.json({ error: "Missing triggerType, data, or schoolId" }, { status: 400 });
    }

    switch (triggerType) {
      case "ATTENDANCE_MARKED": {
        const { studentId, status, date, markedById } = data;
        await handleAttendanceMarked(studentId, status, date, markedById, schoolId);
        break;
      }
      case "LATE_SUBMISSION": {
        const { submissionId } = data;
        await handleLateSubmission(submissionId, schoolId);
        break;
      }
      case "GRADE_BELOW_PASSING": {
        const { examId, studentId, marksObtained } = data;
        await handleGradeBelowPassing(examId, studentId, parseFloat(marksObtained), schoolId);
        break;
      }
      case "FEE_OVERDUE": {
        const { feeId } = data;
        await handleFeeOverdue(feeId, schoolId);
        break;
      }
      case "NEW_ANNOUNCEMENT": {
        const { announcementId } = data;
        await handleNewAnnouncement(announcementId, schoolId);
        break;
      }
      case "EXAM_SCHEDULED": {
        const { examId } = data;
        await handleExamScheduled(examId, schoolId);
        break;
      }
      default:
        return NextResponse.json({ error: `Unsupported trigger type: ${triggerType}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Trigger ${triggerType} executed successfully.` });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_TRIGGER_POST_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
