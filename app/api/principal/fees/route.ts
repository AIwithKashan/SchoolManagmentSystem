import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeeStatus, FeeType } from "@prisma/client";

// GET /api/principal/fees
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
    const status = searchParams.get("status") ?? "";
    const feeType = searchParams.get("feeType") ?? "";
    const month = searchParams.get("month") ?? "";
    const year = searchParams.get("year") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {
      schoolId,
      ...(search && {
        OR: [
          { student: { name: { contains: search, mode: "insensitive" } } },
          { student: { admissionNumber: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(classId && classId !== "all" && { student: { classId } }),
      ...(status && status !== "all" && { status: status as FeeStatus }),
      ...(feeType && feeType !== "all" && { feeType: feeType as FeeType }),
      ...(month && month !== "all" && { month: parseInt(month) }),
      ...(year && year !== "all" && { year: parseInt(year) }),
    };

    // Run paginated query + count
    const [fees, total] = await Promise.all([
      db.fee.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNumber: true,
              rollNumber: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  section: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.fee.count({ where }),
    ]);

    // Compute stats for current school (not filtered by pagination/filters for general overview, or filtered? Usually general overview)
    const feeSums = await db.fee.aggregate({
      where: { schoolId },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalCollected = feeSums._sum.paidAmount ?? 0;
    const totalAmount = feeSums._sum.amount ?? 0;
    const totalPending = Math.max(0, totalAmount - totalCollected);

    const overdueCount = await db.fee.count({
      where: { schoolId, status: FeeStatus.OVERDUE },
    });

    const collectionRate = totalAmount > 0 ? (totalCollected / totalAmount) * 100 : 0;

    return new Response(
      JSON.stringify({
        fees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          totalCollected,
          totalPending,
          overdueCount,
          collectionRate,
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
    console.error('[API_ERROR] [FEES_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST /api/principal/fees
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();

    const {
      bulk,
      studentId,
      classId,
      amount,
      feeType,
      month,
      year,
      dueDate,
      note,
    } = body;

    if (!amount || !feeType || !month || !year || !dueDate) {
      return errorResponse("Amount, feeType, month, year, and dueDate are required", 400);
    }

    const feeAmount = parseFloat(amount);
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const parsedDueDate = new Date(dueDate);

    if (bulk) {
      // Bulk generation mode
      if (!classId) {
        return errorResponse("Class selection is required for bulk generation", 400);
      }

      // Query students in scope
      const students = await db.student.findMany({
        where: {
          schoolId,
          isActive: true,
          ...(classId !== "all" && { classId }),
        },
        select: { id: true },
      });

      if (students.length === 0) {
        return errorResponse("No active students found in the selected class(es)", 400);
      }

      // Query existing fees to prevent duplicates
      const existingFees = await db.fee.findMany({
        where: {
          schoolId,
          feeType: feeType as FeeType,
          month: parsedMonth,
          year: parsedYear,
          studentId: { in: students.map((s) => s.id) },
        },
        select: { studentId: true },
      });

      const existingStudentIds = new Set(existingFees.map((f) => f.studentId));
      const studentsToBill = students.filter((s) => !existingStudentIds.has(s.id));

      if (studentsToBill.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          skipped: students.length,
          message: "All students in this group have already been billed for this month and type.",
        });
      }

      await db.fee.createMany({
        data: studentsToBill.map((s) => ({
          schoolId,
          studentId: s.id,
          amount: feeAmount,
          feeType: feeType as FeeType,
          month: parsedMonth,
          year: parsedYear,
          dueDate: parsedDueDate,
          status: FeeStatus.PENDING,
          paidAmount: 0,
          note: note || null,
        })),
      });

      return NextResponse.json({
        success: true,
        count: studentsToBill.length,
        skipped: students.length - studentsToBill.length,
        message: `Successfully generated ${studentsToBill.length} invoices. Skipped ${students.length - studentsToBill.length} duplicates.`,
      });
    } else {
      // Single Invoice Mode
      if (!studentId) {
        return errorResponse("Student selection is required", 400);
      }

      // Check duplicate
      const duplicate = await db.fee.findFirst({
        where: {
          schoolId,
          studentId,
          feeType: feeType as FeeType,
          month: parsedMonth,
          year: parsedYear,
        },
      });

      if (duplicate) {
        return errorResponse("This record already exists", 409);
      }

      const invoice = await db.fee.create({
        data: {
          schoolId,
          studentId,
          amount: feeAmount,
          feeType: feeType as FeeType,
          month: parsedMonth,
          year: parsedYear,
          dueDate: parsedDueDate,
          status: FeeStatus.PENDING,
          paidAmount: 0,
          note: note || null,
        },
      });

      return NextResponse.json({ success: true, invoice });
    }
  } catch (error) {
    console.error('[API_ERROR] [FEES_POST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
