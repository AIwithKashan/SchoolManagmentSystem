import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateStudentRisk, RiskReport } from '@/lib/ai/early-warning';
import { NotificationType } from '@prisma/client';

// Simple global process cache mapping
const globalForCache = globalThis as unknown as {
  earlyWarningCache: Record<string, { timestamp: number; reports: RiskReport[] }>;
  reviewedStudentsToday: Set<string>;
};

if (!globalForCache.earlyWarningCache) {
  globalForCache.earlyWarningCache = {};
}
if (!globalForCache.reviewedStudentsToday) {
  globalForCache.reviewedStudentsToday = new Set();
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour Cache

export async function GET(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Graceful fallback for CLI tests
    }

    const isDev = process.env.NODE_ENV === 'development';
    let schoolId = session?.user?.schoolId;
    let userRole = session?.user?.role;

    if (!session) {
      const { searchParams } = new URL(req.url);
      const querySchoolId = searchParams.get('schoolId');
      if (isDev && querySchoolId) {
        schoolId = querySchoolId;
        userRole = 'PRINCIPAL';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (userRole !== 'PRINCIPAL' || !schoolId) {
      return NextResponse.json({ error: 'Forbidden: Principal access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const now = Date.now();
    const cached = globalForCache.earlyWarningCache[schoolId];

    let reports: RiskReport[] = [];

    if (cached && !forceRefresh && now - cached.timestamp < CACHE_DURATION_MS) {
      reports = cached.reports;
    } else {
      // Fetch all active students in school
      const students = await db.student.findMany({
        where: { schoolId, isActive: true },
      });

      // Calculate risk reports sequentially or in parallel
      const calculations = students.map((s) => calculateStudentRisk(s.id, schoolId).catch(() => null));
      const results = await Promise.all(calculations);
      reports = results.filter((r): r is RiskReport => r !== null);

      // Save to cache
      globalForCache.earlyWarningCache[schoolId] = {
        timestamp: now,
        reports,
      };
    }

    // Sort by riskScore descending
    const sorted = [...reports].sort((a, b) => b.riskScore - a.riskScore);

    // Map reviewed status
    const reviewedSet = globalForCache.reviewedStudentsToday;
    const finalReports = sorted.map((rep) => ({
      ...rep,
      isReviewed: reviewedSet.has(rep.studentId),
    }));

    // Generate summary metrics
    const summary = {
      critical: finalReports.filter((r) => r.riskLevel === 'CRITICAL' && !r.isReviewed).length,
      high: finalReports.filter((r) => r.riskLevel === 'HIGH' && !r.isReviewed).length,
      medium: finalReports.filter((r) => r.riskLevel === 'MEDIUM' && !r.isReviewed).length,
      low: finalReports.filter((r) => r.riskLevel === 'LOW' && !r.isReviewed).length,
    };

    return NextResponse.json({
      success: true,
      lastUpdated: cached?.timestamp || now,
      reports: finalReports,
      summary,
    });
  } catch (error) {
    console.error('[EarlyWarningGETError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Graceful fallback for CLI tests
    }

    const isDev = process.env.NODE_ENV === 'development';
    let userId = session?.user?.id;
    let schoolId = session?.user?.schoolId;
    let userRole = session?.user?.role;

    const body = await req.json();

    if (!session) {
      if (isDev && body.schoolId && body.userId) {
        userId = body.userId;
        schoolId = body.schoolId;
        userRole = 'PRINCIPAL';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (userRole !== 'PRINCIPAL' || !schoolId || !userId) {
      return NextResponse.json({ error: 'Forbidden: Principal access required' }, { status: 403 });
    }

    const { actionType, studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { classTeacher: { include: { user: true } } } } },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 1. ALERT_PARENTS
    if (actionType === 'ALERT_PARENTS') {
      const parents = await db.parent.findMany({
        where: { studentId },
      });

      for (const p of parents) {
        if (p.userId) {
          await db.notification.create({
            data: {
              userId: p.userId,
              schoolId,
              title: 'Academic Alert: Review Requested',
              content: `The school principal has flagged a performance review action for your child: ${student.name}. Please log in to view recent evaluations.`,
              type: NotificationType.GENERAL,
              isRead: false,
            },
          });
        }
      }

      return NextResponse.json({ success: true, message: `Alert sent to ${parents.length} parents.` });
    }

    // 2. MESSAGE_TEACHER
    if (actionType === 'MESSAGE_TEACHER') {
      const teacherUser = student.class?.classTeacher?.user;

      if (!teacherUser) {
        return NextResponse.json({ error: 'Class teacher not assigned for student class.' }, { status: 404 });
      }

      await db.notification.create({
        data: {
          userId: teacherUser.id,
          schoolId,
          title: `Academic Review Flag: ${student.name}`,
          content: `Principal requested review for student ${student.name} (${student.class.name}-${student.class.section}) regarding metrics warning concerns.`,
          type: NotificationType.GENERAL,
          isRead: false,
        },
      });

      return NextResponse.json({ success: true, message: `Alert message sent to teacher ${teacherUser.name}.` });
    }

    // 3. MARK_REVIEWED
    if (actionType === 'MARK_REVIEWED') {
      if (!globalForCache.reviewedStudentsToday) {
        globalForCache.reviewedStudentsToday = new Set();
      }
      globalForCache.reviewedStudentsToday.add(studentId);

      return NextResponse.json({ success: true, message: 'Student marked as reviewed for today.' });
    }

    return NextResponse.json({ error: 'Unsupported early warning action type' }, { status: 400 });
  } catch (error) {
    console.error('[EarlyWarningPOSTError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
