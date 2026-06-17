import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const [school, classesCount, subjectsCount, teachersCount, studentsCount] =
      await Promise.allSettled([
        db.school.findUnique({
          where: { id: schoolId },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            website: true,
            establishedYear: true,
            academicYear: true,
            currentTerm: true,
            logo: true,
          },
        }),
        db.class.count({ where: { schoolId } }),
        db.subject.count({ where: { schoolId } }),
        db.teacher.count({ where: { schoolId } }),
        db.student.count({ where: { schoolId, isActive: true } }),
      ]);

    return NextResponse.json({
      school: school.status === "fulfilled" ? school.value : null,
      classesCount: classesCount.status === "fulfilled" ? classesCount.value : 0,
      subjectsCount: subjectsCount.status === "fulfilled" ? subjectsCount.value : 0,
      teachersCount: teachersCount.status === "fulfilled" ? teachersCount.value : 0,
      studentsCount: studentsCount.status === "fulfilled" ? studentsCount.value : 0,
    });
  } catch (error) {
    console.error('[API_ERROR] [SETUP_STATUS]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();

    const {
      name,
      address,
      city,
      phone,
      email,
      website,
      establishedYear,
      academicYear,
      currentTerm,
    } = body;

    const updated = await db.school.update({
      where: { id: schoolId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(establishedYear !== undefined && { establishedYear: Number(establishedYear) }),
        ...(academicYear !== undefined && { academicYear }),
        ...(currentTerm !== undefined && { currentTerm }),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        website: true,
        establishedYear: true,
        academicYear: true,
        currentTerm: true,
        logo: true,
      },
    });

    return NextResponse.json({ success: true, school: updated });
  } catch (error) {
    console.error('[API_ERROR] [SETUP_SCHOOL_UPDATE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
