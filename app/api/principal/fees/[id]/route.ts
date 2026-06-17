import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeeStatus } from "@prisma/client";

// PUT /api/principal/fees/[id]
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
    });

    if (!fee) {
      return errorResponse("Record not found", 404);
    }

    const body = await req.json();
    const { paidAmount, receiptNumber, note, paidAt } = body;

    if (paidAmount === undefined) {
      return errorResponse("paidAmount is required", 400);
    }

    const parsedPaidAmount = Math.max(0, parseFloat(paidAmount));
    const parsedPaidAt = paidAt ? new Date(paidAt) : new Date();

    // Recalculate status
    let status: FeeStatus = FeeStatus.PENDING;
    if (parsedPaidAmount >= fee.amount) {
      status = FeeStatus.PAID;
    } else if (parsedPaidAmount > 0) {
      status = FeeStatus.PARTIAL;
    } else {
      // check if overdue
      const now = new Date();
      if (now > fee.dueDate) {
        status = FeeStatus.OVERDUE;
      }
    }

    const updated = await db.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: parsedPaidAmount,
        paidAt: parsedPaidAmount > 0 ? parsedPaidAt : null,
        receiptNumber: receiptNumber || null,
        note: note || null,
        status,
      },
    });

    // Dispatch fee overdue / billing status trigger in the background (NON-BLOCKING)
    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/ai/notifications/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        triggerType: "FEE_OVERDUE",
        data: {
          feeId: updated.id,
        },
        schoolId: updated.schoolId,
      }),
    }).catch((err) => console.error("Error calling fee overdue trigger:", err));

    return NextResponse.json({ success: true, fee: updated });
  } catch (error: any) {
    console.error("[API_ERROR] [FEE_PUT]", error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// DELETE /api/principal/fees/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
    });

    if (!fee) {
      return errorResponse("Record not found", 404);
    }

    await db.fee.delete({
      where: { id: feeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [FEE_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
