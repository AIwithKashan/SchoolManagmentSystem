import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateStudentRisk } from '@/lib/ai/early-warning';
import { NotificationType } from '@prisma/client';

export async function GET(req: Request) {
  try {
    // 1. Fetch all active schools
    const schools = await db.school.findMany();

    const alertsCreated = [];

    for (const school of schools) {
      // 2. Fetch all active students in school
      const students = await db.student.findMany({
        where: { schoolId: school.id, isActive: true },
        include: { class: { include: { classTeacher: { include: { user: true } } } } },
      });

      for (const student of students) {
        // 3. Calculate risk details
        const report = await calculateStudentRisk(student.id, school.id).catch(() => null);
        if (!report) continue;

        // 4. Alert if student is HIGH or CRITICAL risk (riskScore > 40)
        if (report.riskScore > 40) {
          const firstFactor = report.factors[0] || 'Academic/attendance performance requires attention.';

          // Alert Principal
          if (school.principalId) {
            await db.notification.create({
              data: {
                userId: school.principalId,
                schoolId: school.id,
                title: `⚠️ Early Warning Flag: ${student.name}`,
                content: `${student.name} (${report.className}) is flagged as ${report.riskLevel} risk (${report.riskScore}/100). ${firstFactor}`,
                type: NotificationType.GENERAL,
                isRead: false,
              },
            });
          }

          // Alert Teacher
          const teacherUser = student.class?.classTeacher?.user;
          if (teacherUser) {
            await db.notification.create({
              data: {
                userId: teacherUser.id,
                schoolId: school.id,
                title: `⚠️ ${student.name} needs your attention`,
                content: `Early warning alert: ${student.name} has a risk score of ${report.riskScore}/100. ${firstFactor}`,
                type: NotificationType.GENERAL,
                isRead: false,
              },
            });
          }

          alertsCreated.push({
            studentId: student.id,
            studentName: student.name,
            riskScore: report.riskScore,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily cron executed. Generated early warning flags for ${alertsCreated.length} students.`,
      alerts: alertsCreated,
    });
  } catch (error) {
    console.error('[EarlyWarningCronAPIError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
