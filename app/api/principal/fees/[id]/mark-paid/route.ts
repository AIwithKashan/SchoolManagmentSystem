import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeeStatus, NotificationType } from "@prisma/client";

// PUT /api/principal/fees/[id]/mark-paid
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await req.json();
    const { paidAmount, paidAt, note } = body;

    if (paidAmount === undefined) {
      return errorResponse("paidAmount is required", 400);
    }

    const parsedPaidAmount = parseFloat(paidAmount);
    const parsedPaidAt = paidAt ? new Date(paidAt) : new Date();

    // Determine status
    let status: FeeStatus = FeeStatus.PENDING;
    if (parsedPaidAmount >= fee.amount) {
      status = FeeStatus.PAID;
    } else if (parsedPaidAmount > 0) {
      status = FeeStatus.PARTIAL;
    } else {
      const now = new Date();
      if (now > fee.dueDate) {
        status = FeeStatus.OVERDUE;
      }
    }

    // Generate unique receipt number
    const rand = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = fee.receiptNumber || `REC-${new Date().getFullYear()}${String(fee.month).padStart(2, "0")}-${rand}`;

    const updatedFee = await db.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: parsedPaidAmount,
        paidAt: parsedPaidAmount > 0 ? parsedPaidAt : null,
        receiptNumber,
        note: note || null,
        status,
      },
    });

    // Create notification for parents
    const parentUserIds = fee.student.parents.map((p) => p.userId);
    if (parentUserIds.length > 0) {
      await db.notification.createMany({
        data: parentUserIds.map((uid) => ({
          userId: uid,
          schoolId,
          title: `Fee Payment Received - Receipt: ${receiptNumber}`,
          content: `We have successfully received payment of Rs. ${parsedPaidAmount.toLocaleString()} for ${fee.student.name}'s fee invoice (${status}).`,
          type: NotificationType.FEE,
        })),
      });
    }

    return NextResponse.json({ success: true, fee: updatedFee });
  } catch (error) {
    console.error('[API_ERROR] [FEE_MARK_PAID]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
