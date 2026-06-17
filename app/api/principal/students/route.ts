import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { invalidateCache } from "@/lib/cache-invalidation";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/principal/students
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const classId = searchParams.get("classId") ?? "";
    const gender = searchParams.get("gender") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    const where = {
      schoolId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { admissionNumber: { contains: search, mode: "insensitive" as const } },
          { rollNumber: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(classId && classId !== "all" && { classId }),
      ...(gender && gender !== "all" && { gender }),
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    };

    // Paginated list query
    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          rollNumber: true,
          gender: true,
          photo: true,
          isActive: true,
          classId: true,
          admissionDate: true,
          createdAt: true,
          class: { select: { id: true, name: true, section: true } },
          parents: {
            select: {
              user: { select: { name: true, phone: true } },
            },
            take: 1,
          },
          attendances: { select: { status: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    // Efficiently compute stats in a separate query for accuracy
    const allActiveStudents = await db.student.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        classId: true,
        attendances: {
          select: { status: true },
          take: 30, // compute based on last 30 attendance marks for performance
        },
      },
    });

    let activeCount = 0;
    let lowAttendanceCount = 0;
    let noClassCount = 0;

    allActiveStudents.forEach((s) => {
      activeCount++;
      if (!s.classId) noClassCount++;

      const totalAtt = s.attendances.length;
      if (totalAtt > 0) {
        const presentAtt = s.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const pct = (presentAtt / totalAtt) * 100;
        if (pct < 75) {
          lowAttendanceCount++;
        }
      }
    });

    // Count new students this month
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonthCount = await db.student.count({
      where: {
        schoolId,
        createdAt: { gte: firstDayOfMonth },
      },
    });

    const studentList = students.map((s) => {
      const totalAtt = s.attendances.length;
      const presentAtt = s.attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const attendancePct =
        totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : null;
      return {
        id: s.id,
        name: s.name,
        admissionNumber: s.admissionNumber,
        rollNumber: s.rollNumber,
        gender: s.gender,
        isActive: s.isActive,
        photo: s.photo,
        class: s.class,
        admissionDate: s.admissionDate,
        parent: s.parents[0]
          ? {
              name: s.parents[0].user.name,
              phone: s.parents[0].user.phone,
            }
          : null,
        attendancePct,
      };
    });

    return new Response(
      JSON.stringify({
        students: studentList,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          active: activeCount,
          thisMonth: newThisMonthCount,
          lowAttendance: lowAttendanceCount,
          noClass: noClassCount,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error('[API_ERROR] [STUDENTS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST /api/principal/students
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();
    
    const {
      name,
      dateOfBirth,
      gender,
      bloodGroup,
      photo,
      medicalNotes,
      admissionNumber,
      rollNumber,
      classId,
      admissionDate,
      address,
      
      // Parent options
      parentId, // if selecting existing
      parentName,
      parentPhone,
      parentEmail,
      parentRelationship,
      parentCNIC,
      parentOccupation,
      autoCreateParentAccount,
    } = body;

    if (!name || !dateOfBirth || !gender || !admissionNumber || !classId) {
      return errorResponse("Name, dateOfBirth, gender, admissionNumber, and classId are required", 400);
    }

    // Verify class exists and belongs to this school
    const cls = await db.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) {
      return errorResponse("Selected class was not found", 400);
    }

    let tempPassword = "";
    
    // Execute student & parent insertion inside a single transaction
    const student = await db.$transaction(async (tx) => {
      // 1. Create the student
      const newStudent = await tx.student.create({
        data: {
          name,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodGroup: bloodGroup || null,
          photo: photo || null,
          medicalNotes: medicalNotes || null,
          admissionNumber,
          rollNumber: rollNumber || null,
          classId,
          schoolId,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          address: address || null,
        },
      });

      // 2. Parent linking/creation
      if (parentId) {
        // Link to existing parent
        await tx.parent.update({
          where: { id: parentId },
          data: { studentId: newStudent.id },
        });
      } else if (parentName && parentPhone && parentRelationship) {
        let parentUserId = "";

        if (autoCreateParentAccount) {
          // Verify unique username/email in User model
          const parentLoginEmail = parentEmail || `${parentPhone}@edumind.com`;
          const existingUser = await tx.user.findUnique({
            where: { email: parentLoginEmail },
          });

          if (existingUser) {
            parentUserId = existingUser.id;
          } else {
            // Generate standard PWD-XXXX password
            tempPassword = "PWD-" + Math.floor(1000 + Math.random() * 9000);
            const hashedPassword = await hash(tempPassword, 10);

            const newUser = await tx.user.create({
              data: {
                email: parentLoginEmail,
                password: hashedPassword,
                role: "PARENT",
                name: parentName,
                phone: parentPhone,
                avatar: null,
                isActive: true,
              },
            });
            parentUserId = newUser.id;
          }
        } else {
          // Create dummy user for parent without account
          const dummyEmail = `${parentPhone}-${Date.now()}@edumind.dummy`;
          const dummyPassword = await hash("DUMMY_ACCOUNT_PASSWORD", 10);
          const newUser = await tx.user.create({
            data: {
              email: dummyEmail,
              password: dummyPassword,
              role: "PARENT",
              name: parentName,
              phone: parentPhone,
              isActive: false,
            },
          });
          parentUserId = newUser.id;
        }

        // Create Parent record
        await tx.parent.create({
          data: {
            userId: parentUserId,
            studentId: newStudent.id,
            relationship: parentRelationship,
            occupation: parentOccupation || null,
            cnic: parentCNIC || null,
            schoolId,
          },
        });
      }

      return newStudent;
    });

    try {
      invalidateCache.students();
      invalidateCache.schoolStats();
    } catch (e) {
      console.error('[API_ERROR] Revalidation failed:', e);
      return errorResponse("Server error. Please try again.", 500);
    }

    return successResponse({
      student,
      tempPassword: tempPassword || null,
    }, "Student created successfully");
  } catch (error: any) {
    if (error?.code === "P2002") {
      return errorResponse("A student with this admission number or roll number already exists in this class", 409);
    }
    console.error("[API_ERROR] [STUDENTS_POST]", error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
