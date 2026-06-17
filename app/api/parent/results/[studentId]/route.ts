import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { studentId } = params;

    // Verify parent has access to this student
    const parent = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parent) {
      return errorResponse("You do not have permission", 403);
    }

    // Query exam results from database
    const results = await db.examResult.findMany({
      where: { studentId },
      include: {
        exam: {
          include: {
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Grade to GPA mapping helper
    const getGpaPoints = (grade: string): number => {
      switch (grade.toUpperCase()) {
        case "A+":
        case "A":
          return 4.0;
        case "B":
          return 3.0;
        case "C":
          return 2.0;
        case "D":
          return 1.0;
        case "F":
        default:
          return 0.0;
      }
    };

    // Calculate letter grade based on percentage if not present in db
    const calculateGrade = (obtained: number, total: number): string => {
      const percentage = (obtained / total) * 100;
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B";
      if (percentage >= 60) return "C";
      if (percentage >= 50) return "D";
      return "F";
    };

    let totalGpaPoints = 0;
    let countedExams = 0;

    const formattedResults = results.map((res) => {
      const obtained = res.marksObtained;
      const total = res.exam.totalMarks;
      const percentage = Math.round((obtained / total) * 100);
      
      const grade = res.grade || calculateGrade(obtained, total);
      const gpa = getGpaPoints(grade);

      totalGpaPoints += gpa;
      countedExams++;

      return {
        id: res.id,
        subject: res.exam.subject.name,
        examName: res.exam.title,
        obtainedMarks: obtained,
        totalMarks: total,
        percentage,
        grade,
        gpa,
        date: res.exam.examDate.toISOString().split("T")[0],
        remarks: res.remarks || "No remarks added",
      };
    });

    const overallGpa = countedExams > 0 ? parseFloat((totalGpaPoints / countedExams).toFixed(2)) : 0.0;
    
    // Average percentage for motivational banner
    const totalPercentage = formattedResults.reduce((acc, curr) => acc + curr.percentage, 0);
    const averagePercentage = countedExams > 0 ? Math.round(totalPercentage / countedExams) : 100;

    return NextResponse.json({
      gpa: overallGpa,
      averagePercentage,
      results: formattedResults,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_RESULTS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
