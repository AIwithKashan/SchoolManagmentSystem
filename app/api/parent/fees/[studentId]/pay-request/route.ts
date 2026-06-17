import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const feeId = params.studentId; // Next.js dynamic path uses studentId folder slug, but holds the fee ID

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    // 1. Support seamless mock completions for demo cards
    if (feeId.includes("mock")) {
      return NextResponse.json({
        success: true,
        message: "Payment confirmation submitted. Pending school verification.",
      });
    }

    // 2. Fetch the fee record
    const fee = await db.fee.findUnique({
      where: { id: feeId },
      include: {
        student: true,
      },
    });

    if (!fee) {
      return errorResponse("Record not found", 404);
    }

    // 3. Verify parent linkage to student
    const parentRelation = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: fee.studentId,
      },
    });

    if (!parentRelation) {
      return errorResponse("You do not have permission", 403);
    }

    // 4. Update the fee record note to signify payment request submitted
    const updatedFee = await db.fee.update({
      where: { id: feeId },
      data: {
        note: "Pending Verification",
      },
    });

    // 5. Notify the School Principal
    const principalUser = await db.user.findFirst({
      where: { role: "PRINCIPAL", isActive: true },
    });

    if (principalUser) {
      await db.notification.create({
        data: {
          userId: principalUser.id,
          schoolId: fee.schoolId,
          title: "Fee Verification Requested",
          content: `Payment verification requested for ${fee.student.name} for Month: ${fee.month}/${fee.year}. Amount: Rs. ${fee.amount.toLocaleString()}.`,
          type: "FEE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedFee,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PAYMENT_REQUEST_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
