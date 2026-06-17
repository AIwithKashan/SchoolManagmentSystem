import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

// POST /api/principal/fees/[id]/send-reminder
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const feeId = params.id;

    // Check fee exists and belongs to school
    const fee = await db.fee.findFirst({
      where: { id: feeId, schoolId },
      include: {
        student: {
          select: {
            name: true,
            parents: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!fee) {
      return errorResponse("Record not found", 404);
    }

    const remainingAmount = fee.amount - fee.paidAmount;
    const formattedDueDate = new Date(fee.dueDate).toLocaleDateString();

    // Create notification for parents
    const parentUserIds = fee.student.parents.map((p) => p.userId);
    if (parentUserIds.length > 0) {
      await db.notification.createMany({
        data: parentUserIds.map((uid) => ({
          userId: uid,
          schoolId,
          title: `Fee Outstanding Reminder`,
          content: `Reminder: Student ${fee.student.name} has an outstanding fee balance of Rs. ${remainingAmount.toLocaleString()} which is due on ${formattedDueDate}. Please clear the balance.`,
          type: NotificationType.FEE,
        })),
      });
    }

    return NextResponse.json({ success: true, message: "Reminder sent to parent" });
  } catch (error) {
    console.error('[API_ERROR] [FEE_SEND_REMINDER]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
