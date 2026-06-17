import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const parentUserId = session.user.id;

    // Fetch parent profile including user details and student context
    const parents = await db.parent.findMany({
      where: { userId: parentUserId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        school: {
          select: {
            principalId: true,
          },
        },
        student: {
          include: {
            class: {
              include: {
                classTeacher: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        phone: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (parents.length === 0) {
      return errorResponse("Record not found", 404);
    }

    // Consolidated parent information
    const firstParent = parents[0];
    const parentInfo = {
      name: firstParent.user.name,
      email: firstParent.user.email,
      phone: firstParent.user.phone || "",
      avatar: firstParent.user.avatar || null,
      cnic: firstParent.cnic || "",
      occupation: firstParent.occupation || "",
      relationship: firstParent.relationship,
      principalId: firstParent.school.principalId,
    };

    // Linked children profiles
    const childrenInfo = parents.map((p) => {
      const classTeacher = p.student.class?.classTeacher;
      return {
        id: p.student.id,
        name: p.student.name,
        rollNumber: p.student.rollNumber || "N/A",
        className: p.student.class?.name || "Grade N/A",
        section: p.student.class?.section || "N/A",
        admissionNumber: p.student.admissionNumber,
        admissionDate: p.student.admissionDate.toISOString(),
        teacherName: classTeacher?.user.name || "School Administration",
        teacherContact: classTeacher?.user.phone || classTeacher?.user.email || "Contact school office",
      };
    });

    return NextResponse.json({
      parent: parentInfo,
      children: childrenInfo,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_PROFILE_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const parentUserId = session.user.id;
    const body = await req.json();
    const { name, email, phone, avatar, cnic, occupation } = body;

    // 1. Update the User model
    const updatedUser = await db.user.update({
      where: { id: parentUserId },
      data: {
        name: name?.trim(),
        email: email?.trim(),
        phone: phone?.trim() || null,
        avatar: avatar || null,
      },
    });

    // 2. Update all Parent records linked to this userId
    await db.parent.updateMany({
      where: { userId: parentUserId },
      data: {
        cnic: cnic?.trim() || null,
        occupation: occupation?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_PROFILE_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
