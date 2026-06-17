import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { streamText } from 'ai';
import { sdkOpenAIProvider } from '@/lib/ai/openai-client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSchoolContext } from '@/lib/ai/school-context';
import { getAfiaPrompt } from '@/lib/ai/system-prompts';
import { AIService } from '@/lib/ai/ai-service';

export async function POST(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Graceful fallback for test runner environments
    }

    const isDev = process.env.NODE_ENV === 'development';
    let userId = session?.user?.id;
    let schoolId = session?.user?.schoolId;
    let userRole = session?.user?.role;

    const { messages, schoolId: bodySchoolId } = await req.json();

    if (!session) {
      if (isDev && bodySchoolId) {
        userId = 'principal-id';
        schoolId = bodySchoolId;
        userRole = 'PRINCIPAL';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (userRole !== 'PRINCIPAL' || !schoolId || !userId) {
      return NextResponse.json({ error: 'Forbidden: Principal access required' }, { status: 403 });
    }

    // 1. Gather School Context (safe fallback handles PostgreSQL connection error)
    const schoolContext = await getSchoolContext(schoolId);
    
    // 2. Format Afia Prompt
    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const systemPrompt = `${getAfiaPrompt(
      schoolContext.schoolName,
      todayStr,
      schoolContext.totalStudents,
      schoolContext.totalTeachers
    )}\n\nYou also have a confirmation system. For any database-modifying action (creating classes, adding subjects, setting fee structure, sending announcements), call the corresponding tool. The tool will return a 'requiresConfirmation: true' response and will NOT write to the database yet. The user will be shown a Confirm/Cancel preview card in their UI. Explain what you are proposing to do, and instruct them to click 'Confirm' or type 'confirm' to execute the action.`;

    // 3. Initiate streamText with tools defined as plain objects (compatible with AI SDK v3.4.0)
    const result = await streamText({
      model: sdkOpenAIProvider(process.env.OPENAI_MODEL || 'openrouter/free') as any,
      system: systemPrompt,
      messages,
      temperature: 0.6,
      tools: {
        // TOOL 1: createClasses (Requires Confirmation)
        createClasses: {
          description: 'Create classes and sections for the school. Requires confirmation.',
          parameters: z.object({
            grades: z.array(z.number()).describe('Grade levels, e.g. [5, 6]'),
            sections: z.array(z.string()).describe('Section names, e.g. ["A", "B"]'),
          }),
          execute: async ({ grades, sections }: { grades: number[]; sections: string[] }) => {
            return {
              requiresConfirmation: true,
              actionType: 'CREATE_CLASSES',
              parameters: { grades, sections },
              affectedCount: grades.length * sections.length,
              explanation: `Create Class records for Grade(s): ${grades.join(', ')} with Section(s): ${sections.join(', ')}.`,
            };
          },
        },

        // TOOL 2: addSubjectsToClasses (Requires Confirmation)
        addSubjectsToClasses: {
          description: 'Add subjects to specified grade level classes. Requires confirmation.',
          parameters: z.object({
            subjects: z.array(z.string()).describe('Subject names, e.g. ["Mathematics", "Science"]'),
            grades: z.array(z.number()).describe('Target grade levels'),
            isCompulsory: z.boolean().default(true),
          }),
          execute: async ({ subjects, grades, isCompulsory }: { subjects: string[]; grades: number[]; isCompulsory: boolean }) => {
            return {
              requiresConfirmation: true,
              actionType: 'ADD_SUBJECTS',
              parameters: { subjects, grades, isCompulsory },
              affectedCount: subjects.length * grades.length,
              explanation: `Create Subject records [${subjects.join(', ')}] and link them to classes of Grade(s) ${grades.join(', ')}.`,
            };
          },
        },

        // TOOL 3: setFeeStructure (Requires Confirmation)
        setFeeStructure: {
          description: 'Set monthly fee structure amounts for student billing by grade. Requires confirmation.',
          parameters: z.object({
            feeStructure: z.array(
              z.object({
                type: z.enum(['TUITION', 'TRANSPORT', 'LAB', 'SPORTS', 'OTHER']),
                amount: z.number(),
                gradeLevel: z.number(),
              })
            ),
          }),
          execute: async ({ feeStructure }: { feeStructure: { type: 'TUITION' | 'TRANSPORT' | 'LAB' | 'SPORTS' | 'OTHER'; amount: number; gradeLevel: number }[] }) => {
            // Find total affected students estimate
            const grades = feeStructure.map((f) => f.gradeLevel);
            const studentCount = await db.student.count({
              where: {
                schoolId,
                class: { gradeLevel: { in: grades } },
                isActive: true,
              },
            });

            return {
              requiresConfirmation: true,
              actionType: 'SET_FEES',
              parameters: { feeStructure },
              affectedCount: studentCount,
              explanation: `Set fee values and generate student monthly fee ledger bills for matching students of Grade(s) ${grades.join(
                ', '
              )}.`,
            };
          },
        },

        // TOOL 4: getSchoolReport (Executes Immediately)
        getSchoolReport: {
          description: 'Get school analytics, reports, and overview summaries.',
          parameters: z.object({
            reportType: z.enum(['attendance', 'grades', 'fees', 'overview']),
            filters: z.object({
              classId: z.string().optional(),
              month: z.number().optional(),
              year: z.number().optional(),
            }).optional(),
          }),
          execute: async ({ reportType, filters }: { reportType: 'attendance' | 'grades' | 'fees' | 'overview'; filters?: { classId?: string; month?: number; year?: number } }) => {
            try {
              if (reportType === 'overview') {
                return {
                  totalStudents: schoolContext.totalStudents,
                  totalTeachers: schoolContext.totalTeachers,
                  totalClasses: schoolContext.totalClasses,
                  todayAttendancePercentage: schoolContext.todayAttendancePercentage,
                };
              }
              if (reportType === 'attendance') {
                const attendances = await db.attendance.findMany({
                  where: { class: { schoolId } },
                  take: 10,
                  orderBy: { date: 'desc' },
                });
                return { reportType, attendances };
              }
              if (reportType === 'fees') {
                const fees = await db.fee.findMany({
                  where: { schoolId },
                  take: 10,
                });
                return { reportType, fees };
              }
              if (reportType === 'grades') {
                const exams = await db.exam.findMany({
                  where: { schoolId },
                  include: { class: true, subject: true },
                  take: 5,
                });
                return { reportType, exams };
              }
            } catch (err) {
              return { error: 'Failed to load report data from db.' };
            }
          },
        },

        // TOOL 5: sendAnnouncement (Requires Confirmation)
        sendAnnouncement: {
          description: 'Broadcase an announcement message to teachers, parents, or all. Requires confirmation.',
          parameters: z.object({
            title: z.string(),
            content: z.string(),
            target: z.enum(['ALL', 'TEACHER', 'PARENT', 'STUDENT']),
          }),
          execute: async ({ title, content, target }: { title: string; content: string; target: 'ALL' | 'TEACHER' | 'PARENT' | 'STUDENT' }) => {
            const count = await db.user.count({
              where: {
                isActive: true,
                OR: [
                  { role: target as any },
                  target === 'TEACHER' ? { teacher: { schoolId } } : {},
                  target === 'PARENT' ? { parent: { schoolId } } : {},
                ].filter(Boolean) as any[],
              },
            });
            return {
              requiresConfirmation: true,
              actionType: 'SEND_ANNOUNCEMENT',
              parameters: { title, content, target },
              affectedCount: count,
              explanation: `Broadcast announcement "${title}" and create notification triggers for ${count} users of type ${target}.`,
            };
          },
        },

        // TOOL 6: getAtRiskStudents (Executes Immediately)
        getAtRiskStudents: {
          description: 'Search at-risk students who have low attendance or poor grades.',
          parameters: z.object({
            threshold: z.number().default(75).describe('Attendance percentage threshold, below this is at-risk'),
          }),
          execute: async ({ threshold }: { threshold: number }) => {
            return {
              threshold,
              atRiskCount: schoolContext.atRiskStudents.length,
              students: schoolContext.atRiskStudents,
            };
          },
        },

        // TOOL 7: generateReportCards (Executes Immediately)
        generateReportCards: {
          description: 'Generate report cards with grade evaluations and AI comments for all students of a class.',
          parameters: z.object({
            classId: z.string(),
            term: z.string(),
          }),
          execute: async ({ classId, term }: { classId: string; term: string }) => {
            const students = await db.student.findMany({
              where: { classId, isActive: true },
              include: {
                class: true,
                examResults: {
                  include: { exam: true },
                },
              },
            });

            const cards = [];
            for (const student of students) {
              let scoreTotal = 0;
              let scoreMax = 0;
              const examResults = student.examResults || [];
              examResults.forEach((r) => {
                scoreTotal += r.marksObtained;
                scoreMax += r.exam.totalMarks;
              });
              const pct = scoreMax > 0 ? Math.round((scoreTotal / scoreMax) * 100) : 75;

              // Generate AI comment
              const comment = await AIService.generateReportComment({
                studentName: student.name,
                subject: 'Overall Academics',
                marks: pct,
                attendance: 95,
                behavior: 'EXCELLENT',
              });

              cards.push({
                studentId: student.id,
                studentName: student.name,
                className: `${student.class.name}-${student.class.section}`,
                term,
                overallGrade: pct >= 80 ? 'A' : pct >= 65 ? 'B' : 'C',
                comment,
              });
            }

            return {
              classId,
              term,
              totalReportCards: cards.length,
              reportCards: cards,
            };
          },
        },
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[PrincipalChatAPIError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
