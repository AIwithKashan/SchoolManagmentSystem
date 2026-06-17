import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/principal/subjects — Lightweight query for subjects selection dropdowns
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("Unauthorized", 401);
    }
    const schoolId = session.user.schoolId;

    const subjects = await db.subject.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('[API_ERROR] [SUBJECTS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
