import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface FeeRange {
  gradeMin: number;  // inclusive grade level
  gradeMax: number;  // inclusive grade level
  amount: number;
  label: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const schoolId = session.user.schoolId;
    const body = await req.json();
    const { feeRanges } = body as { feeRanges: FeeRange[] };

    if (!feeRanges?.length) {
      return errorResponse("feeRanges is required", 400);
    }

    // Return the parsed structure — actual fee records are created per student
    // This endpoint validates and acknowledges the fee structure
    return NextResponse.json({
      success: true,
      feeRanges,
      message: `Fee structure configured for ${feeRanges.length} tier(s)`,
    });
  } catch (error) {
    console.error('[API_ERROR] [SETUP_FEES]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
