import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error('[API_ERROR] [ASSIGNMENT_SINGLE_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;
    const body = await req.json();

    const {
      title,
      description,
      dueDate,
      totalMarks,
      attachmentUrl,
      isActive,
    } = body;

    const assignment = await db.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    const parsedMarks = totalMarks ? parseFloat(totalMarks) : assignment.totalMarks;

    const updated = await db.assignment.update({
      where: { id },
      data: {
        title: title || assignment.title,
        description: description !== undefined ? description : assignment.description,
        dueDate: dueDate ? new Date(dueDate) : assignment.dueDate,
        totalMarks: parsedMarks,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : assignment.attachmentUrl,
        isActive: isActive !== undefined ? isActive : assignment.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API_ERROR] [ASSIGNMENT_SINGLE_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;

    const assignment = await db.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    await db.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Assignment deleted successfully" });
  } catch (error: any) {
    console.error('[API_ERROR] [ASSIGNMENT_SINGLE_DELETE_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
