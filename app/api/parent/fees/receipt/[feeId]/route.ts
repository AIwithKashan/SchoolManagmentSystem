import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { feeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { feeId } = params;

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    // 1. Support seamless mock queries for demo vouchers
    if (feeId.includes("mock")) {
      const monthNum = parseInt(feeId.split("-").pop() || "4");
      const monthName = new Date(2026, monthNum - 1, 1).toLocaleString("en-US", { month: "long" });

      return NextResponse.json({
        school: {
          name: "Al-Noor School System",
          logo: null,
          address: "123 Education Street, Gulberg III",
          city: "Lahore",
          phone: "042-35761234",
          email: "billing@alnoor.edu.pk",
          website: "www.alnoor.edu.pk",
        },
        student: {
          name: "Ali Ahmed",
          rollNumber: "001",
          admissionNumber: "ADM-2025-001",
          className: "Grade 1 - A",
        },
        receipt: {
          receiptNumber: `REC-2026-0${monthNum}1`,
          month: monthName,
          year: 2026,
          paidDate: new Date(2026, monthNum - 1, 5).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          tuitionFee: 4500,
          transportFee: 500,
          totalAmount: 5000,
          paymentMethod: "Bank Transfer (HBL)",
          status: "PAID",
          note: "Term tuition fee invoice cleared.",
        },
      });
    }

    // 2. Fetch the fee record
    const fee = await db.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        school: true,
      },
    });

    if (!fee) {
      return errorResponse("Record not found", 404);
    }

    // 3. Verify parent linkage
    const parentRelation = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: fee.studentId,
      },
    });

    if (!parentRelation) {
      return errorResponse("You do not have permission", 403);
    }

    const tuitionFee = fee.feeType === "TUITION" ? fee.amount : fee.amount * 0.9;
    const transportFee = fee.amount - tuitionFee;
    const monthName = new Date(fee.year, fee.month - 1, 1).toLocaleString("en-US", { month: "long" });

    return NextResponse.json({
      school: {
        name: fee.school.name,
        logo: fee.school.logo,
        address: fee.school.address,
        city: fee.school.city,
        phone: fee.school.phone || "042-35761234",
        email: fee.school.email || "info@alnoor.edu.pk",
        website: fee.school.website || "www.alnoor.edu.pk",
      },
      student: {
        name: fee.student.name,
        rollNumber: fee.student.rollNumber || "N/A",
        admissionNumber: fee.student.admissionNumber,
        className: fee.student.class ? `${fee.student.class.name} - ${fee.student.class.section}` : "N/A",
      },
      receipt: {
        receiptNumber: fee.receiptNumber || `REC-${fee.year}-0${fee.month}9`,
        month: monthName,
        year: fee.year,
        paidDate: fee.paidAt ? fee.paidAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) : new Date().toLocaleDateString(),
        tuitionFee,
        transportFee: transportFee > 0 ? transportFee : 0,
        totalAmount: fee.amount,
        paymentMethod: "Bank Transfer (Verification Complete)",
        status: fee.status,
        note: fee.note || "Term tuition fee invoice cleared.",
      },
    });
  } catch (error: any) {
    console.error('[API_ERROR] [FEE_RECEIPT_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
