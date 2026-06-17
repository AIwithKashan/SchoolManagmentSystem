import { db } from "@/lib/db";
import { notificationTemplates } from "./notification-templates";
import { FeeStatus } from "@prisma/client";
import logger from "@/lib/logger";

/**
 * Trigger 1 & 5: Handles Attendance Marked notifications.
 */
export async function handleAttendanceMarked(studentId: string, status: string, dateStr: string, markedById: string, schoolId: string) {
  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        parents: { include: { user: true } },
        class: {
          include: {
            classTeacher: { include: { user: true } },
          },
        },
      },
    });

    if (!student) {
      console.warn(`[smart-notifications]: Student ${studentId} not found.`);
      return;
    }

    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString();

    // 1. ABSENT Alert (Trigger 1)
    if (status === "ABSENT") {
      // Get teacher name
      const teacher = await db.teacher.findUnique({
        where: { id: markedById },
        include: { user: true },
      });
      const teacherName = teacher?.user.name ?? "Class Teacher";

      // Notify parents
      const template = notificationTemplates.absentParent(student.name, dateFormatted, teacherName);
      for (const p of student.parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: template.title,
            content: template.content,
            type: template.type,
            isRead: false,
          },
        });
      }

      // Check weekly absences count (Monday to Friday)
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const absentCount = await db.attendance.count({
        where: {
          studentId,
          status: "ABSENT",
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      if (absentCount >= 3) {
        // Find school principal user
        const principal = await db.user.findFirst({
          where: {
            role: "PRINCIPAL",
            principalSchools: { some: { id: schoolId } },
          },
        });

        if (principal) {
          const principalTemplate = notificationTemplates.absentPrincipalEscalation(student.name, absentCount);
          await db.notification.create({
            data: {
              userId: principal.id,
              schoolId,
              title: principalTemplate.title,
              content: principalTemplate.content,
              type: principalTemplate.type,
              isRead: false,
            },
          });
        }
      }
    }

    // 2. Milestone 75% Attendance check (Trigger 5)
    // Find start of the current month
    const startOfMonth = new Date(date);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    const totalMarkedDays = await db.attendance.count({
      where: {
        studentId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const presentOrExcusedCount = await db.attendance.count({
      where: {
        studentId,
        status: { in: ["PRESENT", "LATE", "LEAVE"] },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const attendancePercentage = totalMarkedDays > 0 ? Math.round((presentOrExcusedCount / totalMarkedDays) * 100) : 100;

    if (attendancePercentage === 75) {
      // Trigger Milestone alerts
      const parentMilestone = notificationTemplates.attendanceMilestoneParent(student.name);
      const staffMilestone = notificationTemplates.attendanceMilestoneStaff(student.name);

      // Alert parents
      for (const p of student.parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: parentMilestone.title,
            content: parentMilestone.content,
            type: parentMilestone.type,
            isRead: false,
          },
        });
      }

      // Alert Class Teacher
      const teacherUserId = student.class?.classTeacher?.userId;
      if (teacherUserId) {
        await db.notification.create({
          data: {
            userId: teacherUserId,
            schoolId,
            title: staffMilestone.title,
            content: staffMilestone.content,
            type: staffMilestone.type,
            isRead: false,
          },
        });
      }

      // Alert Principal
      const principal = await db.user.findFirst({
        where: {
          role: "PRINCIPAL",
          principalSchools: { some: { id: schoolId } },
        },
      });

      if (principal) {
        await db.notification.create({
          data: {
            userId: principal.id,
            schoolId,
            title: staffMilestone.title,
            content: staffMilestone.content,
            type: staffMilestone.type,
            isRead: false,
          },
        });
      }
    }
  } catch (error) {
    console.error("[smart-notifications:handleAttendanceMarked]:", error);
  }
}

/**
 * Trigger 2: Handles late submission notifications.
 */
export async function handleLateSubmission(submissionId: string, schoolId: string) {
  try {
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!submission || !submission.submittedAt) {
      return;
    }

    const isLate = submission.submittedAt > submission.assignment.dueDate;

    if (isLate) {
      logger.info(`[smart-notifications:LATE_SUBMISSION] Student ${submission.student.name} submitted assignment "${submission.assignment.title}" late.`);

      // Check pattern: find late submissions of this student in the same school
      const studentSubmissions = await db.submission.findMany({
        where: {
          studentId: submission.studentId,
        },
        include: {
          assignment: true,
        },
      });

      const lateCount = studentSubmissions.filter(
        (s) => s.submittedAt && s.submittedAt > s.assignment.dueDate
      ).length;

      if (lateCount >= 3) {
        // Find teacher user Id
        const teacher = await db.teacher.findUnique({
          where: { id: submission.assignment.teacherId },
          select: { userId: true },
        });

        if (teacher) {
          const template = notificationTemplates.lateSubmissionTeacher(submission.student.name, lateCount);
          await db.notification.create({
            data: {
              userId: teacher.userId,
              schoolId,
              title: template.title,
              content: template.content,
              type: template.type,
              isRead: false,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("[smart-notifications:handleLateSubmission]:", error);
  }
}

/**
 * Trigger 3: Handles Grade Below Passing notifications.
 */
export async function handleGradeBelowPassing(examId: string, studentId: string, marksObtained: number, schoolId: string) {
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
      },
    });

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        parents: true,
      },
    });

    if (!exam || !student) {
      return;
    }

    const isBelowPassing = marksObtained < exam.passingMarks;

    if (isBelowPassing) {
      // Notify parent
      const template = notificationTemplates.gradeBelowPassingParent(
        student.name,
        exam.subject.name,
        marksObtained,
        exam.totalMarks,
        exam.passingMarks
      );

      for (const p of student.parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: template.title,
            content: template.content,
            type: template.type,
            isRead: false,
          },
        });
      }

      // Check if student has 2+ subjects failing
      const studentResults = await db.examResult.findMany({
        where: { studentId },
        include: {
          exam: true,
        },
      });

      const failingResultsCount = studentResults.filter(
        (r) => r.marksObtained < r.exam.passingMarks
      ).length;

      if (failingResultsCount >= 2) {
        // Notify Principal
        const principal = await db.user.findFirst({
          where: {
            role: "PRINCIPAL",
            principalSchools: { some: { id: schoolId } },
          },
        });

        if (principal) {
          const principalTemplate = notificationTemplates.gradeBelowPassingPrincipalEscalation(student.name, failingResultsCount);
          await db.notification.create({
            data: {
              userId: principal.id,
              schoolId,
              title: principalTemplate.title,
              content: principalTemplate.content,
              type: principalTemplate.type,
              isRead: false,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("[smart-notifications:handleGradeBelowPassing]:", error);
  }
}

/**
 * Trigger 4: Handles fee overdue notifications.
 */
export async function handleFeeOverdue(feeId: string, schoolId: string) {
  try {
    const fee = await db.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: {
            parents: true,
          },
        },
      },
    });

    if (!fee || fee.status === "PAID") {
      return;
    }

    const now = new Date();
    const dueDate = new Date(fee.dueDate);

    // Calculate days diff (using UTC normalization to ensure accuracy)
    const normalizedNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const normalizedDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const daysDiff = Math.floor((normalizedNow - normalizedDue) / (24 * 60 * 60 * 1000));

    // Day 1 reminder
    if (daysDiff === 1 && fee.status === "PENDING") {
      const template = notificationTemplates.feeReminderParent(fee.amount);
      for (const p of fee.student.parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: template.title,
            content: template.content,
            type: template.type,
            isRead: false,
          },
        });
      }
    }

    // Day 7 escalation & status shift
    if (daysDiff >= 7 && fee.status !== "OVERDUE") {
      // 1. Shift DB status to OVERDUE
      await db.fee.update({
        where: { id: feeId },
        data: {
          status: FeeStatus.OVERDUE,
        },
      });

      // 2. Urgent Parent notification
      const parentTemplate = notificationTemplates.feeOverdueParent(fee.amount);
      for (const p of fee.student.parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: parentTemplate.title,
            content: parentTemplate.content,
            type: parentTemplate.type,
            isRead: false,
          },
        });
      }

      // 3. Principal notification
      const principal = await db.user.findFirst({
        where: {
          role: "PRINCIPAL",
          principalSchools: { some: { id: schoolId } },
        },
      });

      if (principal) {
        const principalTemplate = notificationTemplates.feeOverduePrincipal(fee.student.name, fee.amount);
        await db.notification.create({
          data: {
            userId: principal.id,
            schoolId,
            title: principalTemplate.title,
            content: principalTemplate.content,
            type: principalTemplate.type,
            isRead: false,
          },
        });
      }
    }
  } catch (error) {
    console.error("[smart-notifications:handleFeeOverdue]:", error);
  }
}

/**
 * Trigger 6: Handles new announcement notifications.
 */
export async function handleNewAnnouncement(announcementId: string, schoolId: string) {
  try {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return;
    }

    const targetUserIds = new Set<string>();

    // Decode metadata if serialized
    let classId: string | null = null;
    let mainContent = announcement.content;

    if (announcement.content.includes("|CONTENT|")) {
      try {
        const parts = announcement.content.split("|CONTENT|");
        const meta = JSON.parse(parts[0].trim());
        classId = meta.classId;
        mainContent = parts[1].trim();
      } catch (e) {
        // Fallback
      }
    }

    // Determine target list
    if (announcement.targetRole === "ALL") {
      const teachers = await db.teacher.findMany({ where: { schoolId }, select: { userId: true } });
      const parents = await db.parent.findMany({ where: { schoolId }, select: { userId: true } });
      teachers.forEach((t) => targetUserIds.add(t.userId));
      parents.forEach((p) => targetUserIds.add(p.userId));
    } else if (announcement.targetRole === "TEACHER") {
      const teachers = await db.teacher.findMany({ where: { schoolId }, select: { userId: true } });
      teachers.forEach((t) => targetUserIds.add(t.userId));
    } else if (announcement.targetRole === "PARENT") {
      if (classId) {
        // Class parents only
        const students = await db.student.findMany({
          where: { schoolId, classId, isActive: true },
          include: { parents: true },
        });
        students.forEach((s) => {
          s.parents.forEach((p) => targetUserIds.add(p.userId));
        });
      } else {
        // General school parents
        const parents = await db.parent.findMany({ where: { schoolId }, select: { userId: true } });
        parents.forEach((p) => targetUserIds.add(p.userId));
      }
    }

    const userIds = Array.from(targetUserIds);
    const contentPreview = mainContent.substring(0, 150);
    const template = notificationTemplates.newAnnouncement(announcement.title, contentPreview);

    if (userIds.length > 0) {
      await db.notification.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          schoolId,
          title: template.title,
          content: template.content,
          type: template.type,
          isRead: false,
        })),
      });
    }
  } catch (error) {
    console.error("[smart-notifications:handleNewAnnouncement]:", error);
  }
}

/**
 * Trigger 7: Handles scheduled exam notifications.
 */
export async function handleExamScheduled(examId: string, schoolId: string) {
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        subject: true,
      },
    });

    if (!exam) {
      return;
    }

    const className = `${exam.class.name}-${exam.class.section}`;
    const examDateStr = new Date(exam.examDate).toLocaleDateString();

    // Fetch parents of students in that class
    const students = await db.student.findMany({
      where: {
        classId: exam.classId,
        schoolId,
        isActive: true,
      },
      include: {
        parents: true,
      },
    });

    const parentUserIds = new Set<string>();
    students.forEach((s) => {
      s.parents.forEach((p) => parentUserIds.add(p.userId));
    });

    const userIds = Array.from(parentUserIds);
    const template = notificationTemplates.examScheduled(
      exam.subject.name,
      examDateStr,
      className,
      exam.totalMarks,
      exam.passingMarks
    );

    if (userIds.length > 0) {
      await db.notification.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          schoolId,
          title: template.title,
          content: template.content,
          type: template.type,
          isRead: false,
        })),
      });
    }
  } catch (error) {
    console.error("[smart-notifications:handleExamScheduled]:", error);
  }
}
