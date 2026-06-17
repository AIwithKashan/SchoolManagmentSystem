import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Grade definitions with display names and numeric grade levels
const GRADE_LEVELS: Record<string, { level: number; displayName: string }> = {
  nursery: { level: 0, displayName: "Nursery" },
  prep: { level: 1, displayName: "Prep" },
  "grade 1": { level: 2, displayName: "Grade 1" },
  "grade 2": { level: 3, displayName: "Grade 2" },
  "grade 3": { level: 4, displayName: "Grade 3" },
  "grade 4": { level: 5, displayName: "Grade 4" },
  "grade 5": { level: 6, displayName: "Grade 5" },
  "grade 6": { level: 7, displayName: "Grade 6" },
  "grade 7": { level: 8, displayName: "Grade 7" },
  "grade 8": { level: 9, displayName: "Grade 8" },
  "grade 9": { level: 10, displayName: "Grade 9" },
  "grade 10": { level: 11, displayName: "Grade 10" },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const schoolId = session.user.schoolId;
    const body = await req.json();
    const { grades, sections } = body as {
      grades: string[];
      sections: string[];
    };

    if (!grades?.length || !sections?.length) {
      return errorResponse("grades and sections are required", 400);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const grade of grades) {
      const gradeInfo = GRADE_LEVELS[grade.toLowerCase()];
      if (!gradeInfo) continue;

      for (const section of sections) {
        const className = gradeInfo.displayName;
        const sectionName = section.toUpperCase();

        try {
          await db.class.create({
            data: {
              name: className,
              section: sectionName,
              gradeLevel: gradeInfo.level,
              schoolId,
              capacity: 30,
            },
          });
          created.push(`${className} ${sectionName}`);
        } catch {
          // Likely unique constraint violation — class already exists
          skipped.push(`${className} ${sectionName}`);
        }
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
    console.error('[API_ERROR] [SETUP_CLASSES]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
