import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { streamText } from 'ai';
import { sdkOpenAIProvider } from '@/lib/ai/openai-client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getParentContext } from '@/lib/ai/school-context';
import { getCarePrompt } from '@/lib/ai/system-prompts';

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
        userId = 'parent-id';
        schoolId = bodySchoolId;
        userRole = 'PARENT';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (userRole !== 'PARENT' || !schoolId || !userId) {
      return NextResponse.json({ error: 'Forbidden: Parent access required' }, { status: 403 });
    }

    // 1. Gather Parent & Child details context
    const parentContext = await getParentContext(userId, schoolId);

    // 2. Format Care Prompt
    const latestGradeSummary = parentContext.recentGrades
      .slice(0, 3)
      .map((g) => `${g.subjectName}: ${g.marksObtained}/${g.totalMarks} (${g.grade})`)
      .join(', ') || 'No grades recorded yet';

    const systemPrompt = `${getCarePrompt(
      parentContext.className, // school name placeholder in raw prompt (using child's class/school names context)
      parentContext.childName,
      parentContext.className,
      parentContext.attendanceRate,
      latestGradeSummary
    )}\n\nYou also have a message forwarding system. If the parent wants to contact the teacher, use the 'messageTeacher' tool. The tool will draft the message and return 'requiresConfirmation: true' showing a Send button to the parent. Explain what you are proposing to write, and guide them to click "Send" to forward the message.\n\nLIMITATIONS:\n- I can only see ${parentContext.childName}'s information.\n- For urgent matters, please contact the school directly at 042-35761234.\n- I can see the data but for official decisions, please speak with the teacher directly.\n- If the user writes in Urdu, respond in Urdu.`;

    // 3. streamText with parent tools
    const result = await streamText({
      model: sdkOpenAIProvider(process.env.OPENAI_MODEL || 'openrouter/free') as any,
      system: systemPrompt,
      messages,
      temperature: 0.5,
      tools: {
        // TOOL 1: getChildSummary (Executes Immediately)
        getChildSummary: {
          description: 'Get overall academic, attendance, and fee summary for the student.',
          parameters: z.object({}),
          execute: async () => {
            return {
              childName: parentContext.childName,
              className: parentContext.className,
              attendanceRate: parentContext.attendanceRate,
              gradesCount: parentContext.recentGrades.length,
              pendingHomeworkCount: parentContext.pendingHomework.length,
              feeInvoicesCount: parentContext.feeStatus.length,
              latestGrades: parentContext.recentGrades.slice(0, 3),
            };
          },
        },

        // TOOL 2: getAttendanceDetails (Executes Immediately)
        getAttendanceDetails: {
          description: "Get detailed attendance stats and recent attendance logs for the student.",
          parameters: z.object({}),
          execute: async () => {
            // Fetch detailed list of attendances
            const student = await db.student.findFirst({
              where: { schoolId, id: parentContext.childId },
              include: {
                attendances: {
                  take: 15,
                  orderBy: { date: 'desc' },
                },
              },
            });

            const attendanceLogs = (student?.attendances || []).map((a) => ({
              date: a.date.toISOString().substring(0, 10),
              status: a.status.toString(),
              note: a.note || '',
            }));

            return {
              childName: parentContext.childName,
              attendanceRate: parentContext.attendanceRate,
              logs: attendanceLogs,
            };
          },
        },

        // TOOL 3: getPendingHomework (Executes Immediately)
        getPendingHomework: {
          description: 'Get list of pending homework assignments for the child.',
          parameters: z.object({}),
          execute: async () => {
            return {
              childName: parentContext.childName,
              pendingHomework: parentContext.pendingHomework,
            };
          },
        },

        // TOOL 4: getFeeStatus (Executes Immediately)
        getFeeStatus: {
          description: 'Get child monthly tuition fee invoices and billing summaries.',
          parameters: z.object({}),
          execute: async () => {
            return {
              childName: parentContext.childName,
              invoices: parentContext.feeStatus,
            };
          },
        },

        // TOOL 5: messageTeacher (Requires Confirmation)
        messageTeacher: {
          description: 'Draft an administrative message to the child\'s class teacher. Requires confirmation.',
          parameters: z.object({
            messageContent: z.string().describe('Message content detail'),
          }),
          execute: async ({ messageContent }) => {
            // Find class teacher profile to address message correctly
            const studentProfile = await db.student.findUnique({
              where: { id: parentContext.childId },
              include: {
                class: {
                  include: {
                    classTeacher: {
                      include: { user: true },
                    },
                  },
                },
              },
            });

            const teacherUser = studentProfile?.class?.classTeacher?.user;
            const teacherName = teacherUser?.name || 'Class Teacher';
            const teacherUserId = teacherUser?.id || 'teacher-id';

            return {
              requiresConfirmation: true,
              actionType: 'SEND_TEACHER_MESSAGE',
              parameters: {
                receiverId: teacherUserId,
                messageContent,
              },
              explanation: `Send message to child's Class Teacher (${teacherName}).`,
              teacherName,
              messageContent,
            };
          },
        },
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[ParentChatAPIError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
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

    if (!session) {
      const { searchParams } = new URL(req.url);
      const querySchoolId = searchParams.get('schoolId');
      if (isDev && querySchoolId) {
        userId = 'parent-id';
        schoolId = querySchoolId;
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Forbidden: Context missing' }, { status: 403 });
    }

    const context = await getParentContext(userId, schoolId);
    return NextResponse.json({ success: true, context });
  } catch (error) {
    console.error('[ParentContextAPIError]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

