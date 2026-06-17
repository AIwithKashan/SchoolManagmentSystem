import { db } from '@/lib/db';
import openai, { isMockAI } from './openai-client';

export interface RiskReport {
  studentId: string;
  studentName: string;
  className: string;
  photo: string | null;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  metrics: {
    attendanceThisMonth: number;
    attendanceLastMonth: number;
    attendanceTrend: 'improving' | 'declining' | 'stable';
    averageGrade: number;
    gradeTrend: 'improving' | 'declining' | 'stable';
    submissionRate: number;
    failedExamsCount: number;
    daysSinceLastSubmission: number;
  };
  aiAnalysis?: {
    primaryRiskFactors: string[];
    likelyRootCause: string;
    recommendedIntervention: string[];
    actionTakenBy: string;
    timeline: string;
  };
}

/**
 * Calculates academic and attendance risk metrics for a single student.
 */
export async function calculateStudentRisk(studentId: string, schoolId: string): Promise<RiskReport> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      attendances: true,
      examResults: {
        include: {
          exam: true,
        },
      },
      submissions: {
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found.`);
  }

  const className = student.class ? `${student.class.name}-${student.class.section}` : 'N/A';
  const classId = student.classId;

  // 1. Calculate Attendance metrics
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const attendances = student.attendances || [];

  const attThisMonth = attendances.filter((a) => a.date >= startOfThisMonth);
  const presentsThisMonth = attThisMonth.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEAVE');
  const attendanceThisMonth = attThisMonth.length > 0 ? Math.round((presentsThisMonth.length / attThisMonth.length) * 100) : 95;

  const attLastMonth = attendances.filter((a) => a.date >= startOfLastMonth && a.date <= endOfLastMonth);
  const presentsLastMonth = attLastMonth.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEAVE');
  const attendanceLastMonth = attLastMonth.length > 0 ? Math.round((presentsLastMonth.length / attLastMonth.length) * 100) : 95;

  let attendanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (attendanceThisMonth > attendanceLastMonth + 2) {
    attendanceTrend = 'improving';
  } else if (attendanceThisMonth < attendanceLastMonth - 2) {
    attendanceTrend = 'declining';
  }

  // 2. Calculate Grade metrics
  const results = student.examResults || [];
  let totalObtained = 0;
  let totalMax = 0;
  results.forEach((r) => {
    totalObtained += r.marksObtained;
    totalMax += r.exam.totalMarks;
  });
  const averageGrade = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 80;

  // Grade Trend: compare average score of recent 50% exams vs older 50% exams
  let gradeTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (results.length >= 2) {
    const half = Math.ceil(results.length / 2);
    const sortedResults = [...results].sort((a, b) => b.exam.examDate.getTime() - a.exam.examDate.getTime()); // Newer first
    const newerHalf = sortedResults.slice(0, half);
    const olderHalf = sortedResults.slice(half);

    const getAvg = (list: typeof results) => {
      let sumO = 0, sumM = 0;
      list.forEach((r) => { sumO += r.marksObtained; sumM += r.exam.totalMarks; });
      return sumM > 0 ? (sumO / sumM) * 100 : 80;
    };

    const newAvg = getAvg(newerHalf);
    const oldAvg = getAvg(olderHalf);

    if (newAvg > oldAvg + 3) {
      gradeTrend = 'improving';
    } else if (newAvg < oldAvg - 3) {
      gradeTrend = 'declining';
    }
  }

  // 3. Assignment Submission Rate
  const assignments = await db.assignment.findMany({
    where: { classId, schoolId, isActive: true },
  });
  const totalAssigned = assignments.length;
  const submissionsCount = student.submissions ? student.submissions.length : 0;
  const submissionRate = totalAssigned > 0 ? Math.round((submissionsCount / totalAssigned) * 100) : 100;

  // 4. Failed Exams
  const failedExams = results.filter((r) => r.marksObtained < r.exam.passingMarks);
  const failedExamsCount = failedExams.length;

  // 5. Days since last submission
  let daysSinceLastSubmission = 30; // Fallback
  if (student.submissions && student.submissions.length > 0) {
    const lastSub = student.submissions[0];
    if (lastSub.submittedAt) {
      const diffTime = Math.abs(now.getTime() - lastSub.submittedAt.getTime());
      daysSinceLastSubmission = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // ─── RISK POINT SCORING ───
  let riskScore = 0;
  const factors: string[] = [];

  // Attendance Points
  if (attendanceThisMonth < 75) {
    riskScore += 20;
    factors.push(`Attendance rate is critically low at ${attendanceThisMonth}% (below 75%).`);
  } else if (attendanceThisMonth >= 75 && attendanceThisMonth <= 80) {
    riskScore += 10;
    factors.push(`Attendance rate requires monitoring at ${attendanceThisMonth}%.`);
  }

  if (attendanceTrend === 'declining') {
    riskScore += 15;
    factors.push(`Attendance trend is declining compared to last month (dropped from ${attendanceLastMonth}%).`);
  }

  // Grade Points
  if (averageGrade < 40) {
    riskScore += 20;
    factors.push(`Academic grades average is failing at ${averageGrade}%.`);
  } else if (averageGrade >= 40 && averageGrade <= 50) {
    riskScore += 10;
    factors.push(`Academic average is near failing range at ${averageGrade}%.`);
  }

  if (gradeTrend === 'declining') {
    riskScore += 15;
    factors.push(`Academic grade performance is declining compared to earlier work.`);
  }

  // Submission Points
  if (submissionRate < 50) {
    riskScore += 20;
    factors.push(`Homework submission rate is extremely low at ${submissionRate}%.`);
  } else if (submissionRate >= 50 && submissionRate <= 70) {
    riskScore += 10;
    factors.push(`Outstanding homework assignments detected (submission rate: ${submissionRate}%).`);
  }

  // Failed Exam Points
  if (failedExamsCount >= 3) {
    riskScore += 10;
    factors.push(`Failed ${failedExamsCount} examinations this academic term.`);
  } else if (failedExamsCount === 2) {
    riskScore += 5;
    factors.push(`Failed 2 examinations this academic term.`);
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  // Assign Risk Levels
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (riskScore > 60) {
    riskLevel = 'CRITICAL';
  } else if (riskScore > 40) {
    riskLevel = 'HIGH';
  } else if (riskScore > 20) {
    riskLevel = 'MEDIUM';
  }

  // 6. Call OpenAI for AI analysis if risk is > 40
  let aiAnalysis;
  if (riskScore > 40) {
    if (isMockAI) {
      aiAnalysis = {
        primaryRiskFactors: [
          attendanceThisMonth < 80 ? 'Poor school attendance rate' : 'Missed homework task submittals',
          averageGrade < 50 ? 'Low academic exam marks' : 'Declining learning trend',
          failedExamsCount > 0 ? 'Failing marks on subject quizzes' : 'Missing assignment submissions',
        ],
        likelyRootCause: `This student is demonstrating clear signs of educational disengagement, possibly driven by missing key cumulative sessions in recent topics and attendance gaps.`,
        recommendedIntervention: [
          'Schedule an urgent align conference call with the student parents.',
          'Provide after-school structured tutorial sessions.',
          'Develop a custom make-up assignment schedule.',
        ],
        actionTakenBy: 'Class Teacher and Counselor',
        timeline: 'Urgent (within 48 hours)',
      };
    } else {
      try {
        const prompt = `Student Name: ${student.name}, Grade: ${className}.
Attendance: ${attendanceThisMonth}%, Grades Average: ${averageGrade}%
Grade Trend: ${gradeTrend}
Submission Rate: ${submissionRate}%
Failed Exams Count: ${failedExamsCount}
Days Since Last Submission: ${daysSinceLastSubmission}

Analyze this student's risk and provide:
1. Primary risk factors (top 3)
2. Likely root cause
3. Recommended intervention (specific steps)
4. Who should take action (teacher/counselor/parent)
5. Timeline (how urgent)

Return ONLY a JSON object of this structure:
{
  "primaryRiskFactors": ["factor1", "factor2", "factor3"],
  "likelyRootCause": "root cause analysis description",
  "recommendedIntervention": ["step1", "step2", "step3"],
  "actionTakenBy": "responsible entity description",
  "timeline": "timeline urgency details"
}`;
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an educational psychologist risk analyst. Output strict JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        aiAnalysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      } catch (err) {
        console.error('Failed to parse AI risk analysis response, using fallback:', err);
        aiAnalysis = {
          primaryRiskFactors: ['Attendance slip', 'Declining exam grades'],
          likelyRootCause: 'Absences are impacting learning of core subject items.',
          recommendedIntervention: ['Notify parent', 'Remedial tutor sessions'],
          actionTakenBy: 'Class Teacher',
          timeline: 'Immediate attention',
        };
      }
    }
  }

  return {
    studentId: student.id,
    studentName: student.name,
    className,
    photo: student.photo,
    riskScore,
    riskLevel,
    factors,
    metrics: {
      attendanceThisMonth,
      attendanceLastMonth,
      attendanceTrend,
      averageGrade,
      gradeTrend,
      submissionRate,
      failedExamsCount,
      daysSinceLastSubmission,
    },
    aiAnalysis,
  };
}
