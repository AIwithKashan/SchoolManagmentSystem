import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const student = await db.student.findFirst({
      where: { id: params.id, schoolId },
      include: {
        class: {
          include: {
            classTeacher: {
              include: {
                user: { select: { name: true, email: true, phone: true } },
              },
            },
            classSubjects: {
              include: {
                subject: { select: { id: true, name: true } },
                teacher: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
        parents: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 90,
          select: { date: true, status: true },
        },
        fees: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, amount: true, paidAmount: true, feeType: true, month: true, year: true, status: true, paidAt: true, dueDate: true },
        },
        examResults: {
          include: {
            exam: {
              select: { title: true, totalMarks: true, passingMarks: true, examType: true, examDate: true,
                subject: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        submissions: {
          include: {
            assignment: {
              select: { title: true, dueDate: true, totalMarks: true,
                subject: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) {
      return errorResponse("Record not found", 404);
    }

    const totalAtt = student.attendances.length;
    const presentAtt = student.attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : null;

    return NextResponse.json({ student: { ...student, attendancePct } });
  } catch (error) {
    console.error('[API_ERROR] [STUDENT_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.student.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) return errorResponse("Record not found", 404);

    const body = await req.json();
    const updated = await db.student.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.gender && { gender: body.gender }),
        ...(body.bloodGroup !== undefined && { bloodGroup: body.bloodGroup }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.medicalNotes !== undefined && { medicalNotes: body.medicalNotes }),
        ...(body.classId && { classId: body.classId }),
        ...(body.rollNumber !== undefined && { rollNumber: body.rollNumber }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error('[API_ERROR] [STUDENT_PUT]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.student.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) return errorResponse("Record not found", 404);

    // Soft delete — deactivate instead of hard delete
    await db.student.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [STUDENT_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
