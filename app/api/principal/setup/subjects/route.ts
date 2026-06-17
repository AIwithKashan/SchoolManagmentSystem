import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const schoolId = session.user.schoolId;
    const body = await req.json();
    const { subjects, gradeLevel } = body as {
      subjects: string[];
      gradeLevel?: number; // if null, create for all grade levels
    };

    if (!subjects?.length) {
      return errorResponse("subjects array is required", 400);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const subjectName of subjects) {
      const name = subjectName.trim();
      if (!name) continue;

      // Generate a short code from the subject name
      const code = name
        .split(" ")
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 5) + (gradeLevel !== undefined ? `${gradeLevel}` : "");

      const targetGradeLevel = gradeLevel ?? 0; // default to 0 when applying to all

      try {
        await db.subject.create({
          data: {
            name,
            code: `${code}-${Date.now().toString(36).slice(-4)}`,
            gradeLevel: targetGradeLevel,
            schoolId,
            isCompulsory: true,
          },
        });
        created.push(name);
      } catch {
        skipped.push(name);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      totalCreated: created.length,
      totalSkipped: skipped.length,
    });
  } catch (error) {
    console.error('[API_ERROR] [SETUP_SUBJECTS]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
