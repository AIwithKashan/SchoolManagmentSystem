import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/principal/ai/chat
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return errorResponse("Prompt is required", 400);
    }

    const query = prompt.toLowerCase().trim();
    let reply = "";

    // ─── Direct Database Scoping Checks ─────────────────────────────
    if (query.includes("fee") || query.includes("unpaid") || query.includes("collected") || query.includes("billing")) {
      const aggregates = await db.fee.aggregate({
        where: { schoolId },
        _sum: {
          amount: true,
          paidAmount: true,
        },
      });

      const collected = aggregates._sum.paidAmount ?? 0;
      const target = aggregates._sum.amount ?? 0;
      const outstanding = Math.max(0, target - collected);

      const formatPKR = (v: number) => `Rs. ${v.toLocaleString()}`;

      reply = `🎓 **Afia AI Financial Audit** 🎓\n\nHere is the current school fee collection breakdown:\n- **Total Bill Targets**: ${formatPKR(target)}\n- **Total Collected**: ${formatPKR(collected)}\n- **Outstanding Balance**: ${formatPKR(outstanding)}\n\nWould you like me to draft an overdue warning notice to parents?`;
    } else if (query.includes("attendance") || query.includes("present") || query.includes("absent")) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const totalToday = await db.attendance.count({
        where: { student: { schoolId }, date: { gte: todayStart, lte: todayEnd } },
      });

      const presentToday = await db.attendance.count({
        where: {
          student: { schoolId },
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["PRESENT", "LATE"] },
        },
      });

      const rate = totalToday > 0 ? (presentToday / totalToday) * 100 : 0;

      if (totalToday === 0) {
        reply = `🎓 **Afia AI Attendance Report** 🎓\n\nNo check-ins have been recorded today yet. Ensure teachers mark daily attendance rolls from their workstation. Let me know if you would like me to list the classes that haven't submitted their attendance yet.`;
      } else {
        reply = `🎓 **Afia AI Attendance Report** 🎓\n\nToday's check-in metrics stand at:\n- **Marked Rolls Count**: ${totalToday} students\n- **Present/Late Count**: ${presentToday} students\n- **Overall Attendance Rate**: **${rate.toFixed(1)}%**\n\nWould you like me to pull the chronic absenteeism report (students below 75% this month)?`;
      }
    } else if (query.includes("teacher") || query.includes("classes") || query.includes("assignment")) {
      const unassignedClasses = await db.class.findMany({
        where: { schoolId, classTeacherId: null },
        select: { name: true, section: true },
      });

      const listNames = unassignedClasses.map((c) => `${c.name}-${c.section}`).join(", ");

      if (unassignedClasses.length === 0) {
        reply = `🎓 **Afia AI Classroom Audit** 🎓\n\nGreat news! Every class in your school has an assigned class teacher. You are fully staffed and organized.`;
      } else {
        reply = `🎓 **Afia AI Classroom Audit** 🎓\n\nI detected **${unassignedClasses.length} class(es)** missing an assigned Class Teacher:\n👉 ${listNames}\n\nYou can head to the Class Management page to link teachers or let me help you assign them!`;
      }
    } else if (query.includes("student") || query.includes("count") || query.includes("active")) {
      const studentCount = await db.student.count({
        where: { schoolId, isActive: true },
      });
      const teacherCount = await db.teacher.count({
        where: { schoolId, user: { isActive: true } },
      });

      reply = `🎓 **Afia AI Student & Staff Census** 🎓\n\nYour school currently registers:\n- **Active Enrolled Students**: ${studentCount} students\n- **Active Faculty Staff**: ${teacherCount} teachers\n\nLet me know if you want to import more students using CSV files or register a new teacher!`;
    } else {
      reply = `Hello! I'm **Afia**, your School AI Assistant 🎓\n\nI can analyze your database in real-time. Try asking me:\n- *"What is our overall attendance rate?"*\n- *"Show me our outstanding fee collection balance"*\n- *"Are there any classes without class teachers?"*\n- *"Count our total active students and staff"*`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[API_ERROR] [AI_CHAT_POST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
