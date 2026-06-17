import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TargetRole, FeeType, NotificationType, PortalType, AIActionStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      // Graceful fallback for test runner environments
    }
    
    // In production, enforce authentication. For local testing, allow fallback body values.
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

    const { actionType, parameters, actionId } = body;

    // Handle UNDO action
    if (actionType === 'UNDO') {
      if (!actionId) {
        return NextResponse.json({ error: 'Missing actionId for UNDO' }, { status: 400 });
      }

      const action = await db.aIAction.findUnique({
        where: { id: actionId },
      });

      if (!action) {
        return NextResponse.json({ error: 'AIAction log not found' }, { status: 404 });
      }

      if (action.status === AIActionStatus.UNDONE) {
        return NextResponse.json({ error: 'Action has already been undone' }, { status: 400 });
      }

      const recordDetails = action.actionTaken as any;

      // Reverse class creations
      if (recordDetails?.createdClasses && Array.isArray(recordDetails.createdClasses)) {
        await db.class.deleteMany({
          where: { id: { in: recordDetails.createdClasses } },
        });
      }

      // Reverse class subjects
      if (recordDetails?.createdClassSubjects && Array.isArray(recordDetails.createdClassSubjects)) {
        await db.classSubject.deleteMany({
          where: { id: { in: recordDetails.createdClassSubjects } },
        });
      }

      // Reverse subjects
      if (recordDetails?.createdSubjects && Array.isArray(recordDetails.createdSubjects)) {
        await db.subject.deleteMany({
          where: { id: { in: recordDetails.createdSubjects } },
        });
      }

      // Reverse fee creations
      if (recordDetails?.createdFees && Array.isArray(recordDetails.createdFees)) {
        await db.fee.deleteMany({
          where: { id: { in: recordDetails.createdFees } },
        });
      }

      // Reverse announcements & notifications
      if (recordDetails?.createdAnnouncementId) {
        await db.announcement.delete({
          where: { id: recordDetails.createdAnnouncementId },
        });
      }
      if (recordDetails?.createdNotificationIds && Array.isArray(recordDetails.createdNotificationIds)) {
        await db.notification.deleteMany({
          where: { id: { in: recordDetails.createdNotificationIds } },
        });
      }

      // Update AI action status
      await db.aIAction.update({
        where: { id: actionId },
        data: { status: AIActionStatus.UNDONE },
      });

      return NextResponse.json({
        success: true,
        message: 'Action successfully reverted.',
      });
    }

    // Handle standard action executions
    let actionTaken: any = {};
    let commandSummary = '';
    let affectedCount = 0;

    if (actionType === 'CREATE_CLASSES') {
      const { grades, sections } = parameters;
      const createdClassIds: string[] = [];

      for (const grade of grades) {
        for (const section of sections) {
          const className = `Grade ${grade}`;
          
          // Check for existing class
          const existing = await db.class.findUnique({
            where: {
              name_section_schoolId: {
                name: className,
                section: section.toUpperCase(),
                schoolId,
              },
            },
          });

          if (!existing) {
            const newClass = await db.class.create({
              data: {
                name: className,
                section: section.toUpperCase(),
                gradeLevel: grade,
                schoolId,
                capacity: 30,
              },
            });
            createdClassIds.push(newClass.id);
          }
        }
      }

      actionTaken = { createdClasses: createdClassIds };
      affectedCount = createdClassIds.length;
      commandSummary = `Created classes for Grades: ${grades.join(', ')} with Sections: ${sections.join(', ')}.`;
    } 
    else if (actionType === 'ADD_SUBJECTS') {
      const { subjects, grades, isCompulsory = true } = parameters;
      const createdSubjectIds: string[] = [];
      const createdClassSubjectIds: string[] = [];

      // Find matching classes in school
      const classes = await db.class.findMany({
        where: {
          schoolId,
          gradeLevel: { in: grades },
        },
      });

      for (const subjectName of subjects) {
        const subjectCode = `${subjectName.substring(0, 4).toUpperCase()}-${grades.join('')}`;
        
        // Upsert subject for the school
        let subject = await db.subject.findFirst({
          where: {
            code: subjectCode,
            schoolId,
          },
        });

        if (!subject) {
          subject = await db.subject.create({
            data: {
              name: subjectName,
              code: subjectCode,
              gradeLevel: grades[0] || 5,
              schoolId,
              isCompulsory,
            },
          });
          createdSubjectIds.push(subject.id);
        }

        // Link with classes
        for (const cls of classes) {
          const existingLink = await db.classSubject.findFirst({
            where: {
              classId: cls.id,
              subjectId: subject.id,
            },
          });

          if (!existingLink) {
            const link = await db.classSubject.create({
              data: {
                classId: cls.id,
                subjectId: subject.id,
              },
            });
            createdClassSubjectIds.push(link.id);
          }
        }
      }

      actionTaken = {
        createdSubjects: createdSubjectIds,
        createdClassSubjects: createdClassSubjectIds,
      };
      affectedCount = createdClassSubjectIds.length;
      commandSummary = `Added subjects [${subjects.join(', ')}] to matching class grades.`;
    } 
    else if (actionType === 'SET_FEES') {
      const { feeStructure } = parameters;
      const createdFeeIds: string[] = [];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const dueDate = new Date();
      dueDate.setDate(10); // Due 10th of current month
      
      for (const feeRule of feeStructure) {
        const { type, amount, gradeLevel } = feeRule;
        
        // Find matching students
        const students = await db.student.findMany({
          where: {
            schoolId,
            isActive: true,
            class: {
              gradeLevel: gradeLevel || 5,
            },
          },
        });

        for (const student of students) {
          // Check if fee invoice already exists
          const existing = await db.fee.findFirst({
            where: {
              studentId: student.id,
              schoolId,
              month: currentMonth,
              year: currentYear,
              feeType: type as FeeType,
            },
          });

          if (!existing) {
            const fee = await db.fee.create({
              data: {
                schoolId,
                studentId: student.id,
                amount,
                feeType: type as FeeType,
                month: currentMonth,
                year: currentYear,
                dueDate,
                status: 'PENDING',
                paidAmount: 0,
              },
            });
            createdFeeIds.push(fee.id);
          }
        }
      }

      actionTaken = { createdFees: createdFeeIds };
      affectedCount = createdFeeIds.length;
      commandSummary = `Generated ${createdFeeIds.length} student fee invoices for the month.`;
    } 
    else if (actionType === 'SEND_ANNOUNCEMENT') {
      const { title, content, target = 'ALL' } = parameters;
      const createdNotificationIds: string[] = [];

      // 1. Create announcement
      const announcement = await db.announcement.create({
        data: {
          title,
          content,
          schoolId,
          targetRole: target as TargetRole,
          createdById: userId,
          isActive: true,
        },
      });

      // 2. Fetch users matching target role
      let userQuery: any = { schoolId, isActive: true };
      if (target === 'TEACHER') {
        userQuery = { schoolId, teachers: { some: {} } };
      } else if (target === 'PARENT') {
        userQuery = { schoolId, parents: { some: {} } };
      }

      const targetUsers = await db.user.findMany({
        where: {
          isActive: true,
          OR: [
            // If they match role or are principal
            { role: target as any },
            // Fallback checking nested relationships
            target === 'TEACHER' ? { teacher: { schoolId } } : {},
            target === 'PARENT' ? { parent: { schoolId } } : {},
          ].filter(Boolean) as any[],
        },
      });

      // Create notification rows
      for (const u of targetUsers) {
        const notif = await db.notification.create({
          data: {
            userId: u.id,
            schoolId,
            title: `New announcement: ${title}`,
            content: content.slice(0, 100) + '...',
            type: NotificationType.ANNOUNCEMENT,
            isRead: false,
          },
        });
        createdNotificationIds.push(notif.id);
      }

      actionTaken = {
        createdAnnouncementId: announcement.id,
        createdNotificationIds,
      };
      affectedCount = createdNotificationIds.length;
      commandSummary = `Broadcast announcement "${title}" to target group ${target}.`;
    } 
    else {
      return NextResponse.json({ error: `Unsupported action type: ${actionType}` }, { status: 400 });
    }

    // Log the confirmed execution action to the AIAction table
    const log = await db.aIAction.create({
      data: {
        schoolId,
        userId,
        portalType: PortalType.PRINCIPAL,
        command: commandSummary,
        actionTaken,
        status: AIActionStatus.SUCCESS,
        canUndo: true,
      },
    });

    return NextResponse.json({
      success: true,
      actionId: log.id,
      message: 'Action executed successfully.',
      affectedCount,
    });
  } catch (error) {
    console.error('[Action Execution Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
