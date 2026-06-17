import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { PortalType, AIActionStatus, NotificationType, ExamType, FeeType } from '@prisma/client';

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

    const body = await req.json();

    if (!session) {
      if (isDev && body.schoolId && body.userId) {
        userId = body.userId;
        schoolId = body.schoolId;
        userRole = 'TEACHER';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
      }
    }

    if (userRole !== 'TEACHER' || !schoolId || !userId) {
      return NextResponse.json({ error: 'Forbidden: Teacher access required' }, { status: 403 });
    }

    const { actionType, parameters } = body;

    // Resolve teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    let actionTaken: any = {};
    let commandSummary = '';
    let affectedCount = 0;

    // 1. SAVE_LESSON_PLAN
    if (actionType === 'SAVE_LESSON_PLAN') {
      const { title, subject, topic, grade, duration, content } = parameters;

      // Find target class for lesson plan mapping
      let cls = await db.class.findFirst({
        where: { schoolId, gradeLevel: Number(grade.replace(/\D/g, '')) || 5 },
      });

      if (!cls) {
        // Grab first class
        cls = await db.class.findFirst({ where: { schoolId } });
      }

      const lesson = await db.lessonPlan.create({
        data: {
          title,
          teacherId: teacher.id,
          classId: cls?.id || 'class-id',
          subject,
          topic,
          duration,
          content: content || {},
          isAIGenerated: true,
        },
      });

      actionTaken = { createdLessonPlanId: lesson.id };
      affectedCount = 1;
      commandSummary = `Saved Lesson Plan: "${title}" for ${subject} (${topic}).`;
    }
    // 2. COMMIT_GRADING
    else if (actionType === 'COMMIT_GRADING') {
      const { assignmentId, grades } = parameters;
      const updatedSubmissionIds: string[] = [];

      for (const item of grades) {
        const { submissionId, studentId, score, feedback } = item;

        // 1. Update submission details in DB
        await db.submission.update({
          where: { id: submissionId },
          data: {
            teacherScore: score,
            teacherFeedback: feedback,
            status: 'GRADED',
          },
        });
        updatedSubmissionIds.push(submissionId);

        // 2. Resolve parent profiles to send notifications
        const parents = await db.parent.findMany({
          where: { studentId },
          include: { user: true },
        });

        for (const parent of parents) {
          if (parent.userId) {
            await db.notification.create({
              data: {
                userId: parent.userId,
                schoolId,
                title: 'Homework evaluation results published',
                content: `Evaluation posted. Score: ${score}. Review comments in homework menu.`,
                type: NotificationType.GRADE,
                isRead: false,
              },
            });
          }
        }
      }

      actionTaken = { updatedSubmissions: updatedSubmissionIds };
      affectedCount = updatedSubmissionIds.length;
      commandSummary = `Graded and completed evaluations for ${updatedSubmissionIds.length} submission(s).`;
    }
    // 3. CREATE_QUIZ
    else if (actionType === 'CREATE_QUIZ') {
      const { title, classId, subjectId, totalMarks, passingMarks, examDate, startTime, endTime } = parameters;

      const quiz = await db.exam.create({
        data: {
          title,
          schoolId,
          classId,
          subjectId,
          examDate: new Date(examDate),
          startTime,
          endTime,
          totalMarks,
          passingMarks,
          examType: ExamType.QUIZ,
        },
      });

      actionTaken = { createdQuizId: quiz.id };
      affectedCount = 1;
      commandSummary = `Created Quiz: "${title}" with total marks: ${totalMarks}.`;
    }
    // 4. SEND_PARENT_MESSAGE
    else if (actionType === 'SEND_PARENT_MESSAGE') {
      const { studentId, messageContent, subject } = parameters;

      const parents = await db.parent.findMany({
        where: { studentId },
        include: { user: true },
      });

      if (parents.length === 0) {
        return NextResponse.json({ error: 'No parent profiles associated with student.' }, { status: 404 });
      }

      const sentMessageIds: string[] = [];
      const notifIds: string[] = [];

      for (const parent of parents) {
        if (parent.userId) {
          // Send message
          const msg = await db.message.create({
            data: {
              senderId: userId,
              receiverId: parent.userId,
              schoolId,
              content: messageContent,
              isRead: false,
            },
          });
          sentMessageIds.push(msg.id);

          // Create notification
          const notif = await db.notification.create({
            data: {
              userId: parent.userId,
              schoolId,
              title: `New message from teacher: ${subject}`,
              content: messageContent.slice(0, 100) + '...',
              type: NotificationType.GENERAL,
              isRead: false,
            },
          });
          notifIds.push(notif.id);
        }
      }

      actionTaken = { sentMessageIds, sentNotifications: notifIds };
      affectedCount = sentMessageIds.length;
      commandSummary = `Sent teacher message draft to the parents of student ID: ${studentId}.`;
    }
    // 5. MARK_ATTENDANCE
    else if (actionType === 'MARK_ATTENDANCE') {
      const { classId, date, attendance } = parameters;
      const targetDate = new Date(date);
      const createdAttendanceIds: string[] = [];

      for (const item of attendance) {
        const { studentId, status } = item;

        // Upsert attendance using matching query check
        const existing = await db.attendance.findFirst({
          where: {
            studentId,
            classId,
            date: {
              gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              lte: new Date(targetDate.setHours(23, 59, 59, 999)),
            },
          },
        });

        let attRecord;
        if (existing) {
          attRecord = await db.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              markedById: teacher.id,
            },
          });
        } else {
          attRecord = await db.attendance.create({
            data: {
              studentId,
              classId,
              date: new Date(date),
              status,
              markedById: teacher.id,
            },
          });
        }
        createdAttendanceIds.push(attRecord.id);

        // If ABSENT, notify parents
        if (status === 'ABSENT') {
          const parents = await db.parent.findMany({
            where: { studentId },
            include: { user: true },
          });

          for (const parent of parents) {
            if (parent.userId) {
              await db.notification.create({
                data: {
                  userId: parent.userId,
                  schoolId,
                  title: 'Student marked ABSENT today',
                  content: `Your child was marked absent in class on date: ${date}.`,
                  type: NotificationType.ATTENDANCE,
                  isRead: false,
                },
              });
            }
          }
        }
      }

      actionTaken = { createdAttendance: createdAttendanceIds };
      affectedCount = createdAttendanceIds.length;
      commandSummary = `Marked attendance list for class ID: ${classId} on date: ${date} (${createdAttendanceIds.length} records).`;
    } else {
      return NextResponse.json({ error: `Unsupported teacher action type: ${actionType}` }, { status: 400 });
    }

    // Log the action write to AIAction
    const log = await db.aIAction.create({
      data: {
        schoolId,
        userId,
        portalType: PortalType.TEACHER,
        command: commandSummary,
        actionTaken,
        status: AIActionStatus.SUCCESS,
        canUndo: false,
      },
    });

    return NextResponse.json({
      success: true,
      actionId: log.id,
      message: 'Action completed and logged successfully.',
      affectedCount,
    });
  } catch (error) {
    console.error('[Teacher Execute Action Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
