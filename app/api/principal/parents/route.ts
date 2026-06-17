import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/principal/parents — Lightweight query for parent selection dropdown
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("Unauthorized", 401);
    }
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    if (!search || search.length < 2) {
      return NextResponse.json({ parents: [] });
    }

    const parents = await db.parent.findMany({
      where: {
        schoolId,
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      },
      select: {
        id: true,
        relationship: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        student: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
    });

    const formatted = parents.map((p) => ({
      id: p.id,
      name: p.user.name,
      phone: p.user.phone,
      email: p.user.email,
      relationship: p.relationship,
      childName: p.student.name,
    }));

    return NextResponse.json({ parents: formatted });
  } catch (error) {
    console.error('[API_ERROR] [PARENTS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
