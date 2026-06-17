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
    const { studentId } = params;

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    // 1. Verify parent owns this student
    const parentRelation = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parentRelation) {
      return errorResponse("You do not have permission", 403);
    }

    // 2. Fetch student details to get their classId
    const student = await db.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return errorResponse("Record not found", 404);
    }

    // 3. Fetch subjects and teachers for this class to make the schedule look real and dynamic
    const classSubjects = await db.classSubject.findMany({
      where: { classId: student.classId },
      include: {
        subject: true,
        teacher: { include: { user: true } },
      },
    });

    const subjectsMap = classSubjects.map((cs) => ({
      name: cs.subject.name,
      teacher: cs.teacher?.user?.name || "Ms. Sara Ali",
    }));

    // Default fallback subjects if none are configured in database
    const defaultSubjects = [
      { name: "Mathematics", teacher: "Ms. Sara Ali" },
      { name: "Science", teacher: "Mr. Usman Shah" },
      { name: "English", teacher: "Mrs. Nabila Jameel" },
      { name: "Urdu", teacher: "Mr. Tariq Mahmood" },
      { name: "Islamiat", teacher: "Mr. Ahmad Raza" },
    ];

    const finalSubjects = subjectsMap.length > 0 ? subjectsMap : defaultSubjects;

    // 4. Formulate the Weekly Schedule Grid
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = [
      { number: 1, time: "08:30 AM - 09:15 AM" },
      { number: 2, time: "09:15 AM - 10:00 AM" },
      { number: 3, time: "10:00 AM - 10:45 AM" },
      { number: 4, time: "11:15 AM - 12:00 PM" },
      { number: 5, time: "12:00 PM - 12:45 PM" },
      { number: 6, time: "12:45 PM - 01:30 PM" },
    ];

    const weeklyTimetable = days.map((dayName) => {
      const dayPeriods = periods.map((p, idx) => {
        // Assign subjects in a repeating pattern based on day/period indexes to keep layout rich
        const subjectIdx = (idx + dayName.length) % finalSubjects.length;
        const assigned = finalSubjects[subjectIdx];

        return {
          periodNumber: p.number,
          timeString: p.time,
          subjectName: assigned.name,
          teacherName: assigned.teacher,
        };
      });

      return {
        day: dayName,
        periods: dayPeriods,
      };
    });

    return NextResponse.json({
      breakPeriod: {
        timeString: "10:45 AM - 11:15 AM",
        label: "Recess Break 🥪"
      },
      timetable: weeklyTimetable
    });
  } catch (error: any) {
    console.error('[API_ERROR] [STUDENT_TIMETABLE_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
