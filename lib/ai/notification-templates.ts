import { NotificationType } from "@prisma/client";

export const notificationTemplates = {
  // Trigger 1: Attendance Absent (Parent)
  absentParent(childName: string, date: string, teacherName: string) {
    return {
      title: "Attendance Alert: Absent",
      content: `📅 ${childName} was marked absent today (${date}) by ${teacherName}. If this is incorrect, please contact school.`,
      type: "ATTENDANCE" as NotificationType,
    };
  },

  // Trigger 1: Attendance Absent Escalation (Principal)
  absentPrincipalEscalation(childName: string, count: number) {
    return {
      title: "Absence Escalation Alert",
      content: `${childName} has been absent ${count} times this week. Parent contact recommended.`,
      type: "ATTENDANCE" as NotificationType,
    };
  },

  // Trigger 2: Late Submission (Teacher)
  lateSubmissionTeacher(studentName: string, count: number) {
    return {
      title: "Late Submission Pattern Alert",
      content: `${studentName} has submitted late ${count} times. Consider discussing with parents.`,
      type: "GENERAL" as NotificationType,
    };
  },

  // Trigger 3: Grade Below Passing (Parent)
  gradeBelowPassingParent(childName: string, subjectName: string, score: number, total: number, passing: number) {
    return {
      title: "Academic Warning: Low Score",
      content: `${childName} scored ${score}/${total} in ${subjectName} exam. This is below the passing mark of ${passing}. Please help your child with extra study.`,
      type: "GRADE" as NotificationType,
    };
  },

  // Trigger 3: Grade Below Passing Escalation (Principal)
  gradeBelowPassingPrincipalEscalation(studentName: string, count: number) {
    return {
      title: "Academic Intervention Alert",
      content: `${studentName} is failing in ${count} subjects. Principal attention recommended.`,
      type: "GRADE" as NotificationType,
    };
  },

  // Trigger 4: Fee Overdue Day 1 (Parent)
  feeReminderParent(amount: number) {
    return {
      title: "Fee Reminder",
      content: `Fee of Rs.${amount} was due yesterday. Please pay at your earliest.`,
      type: "FEE" as NotificationType,
    };
  },

  // Trigger 4: Fee Overdue Day 7 (Parent)
  feeOverdueParent(amount: number) {
    return {
      title: "Urgent Fee Notice",
      content: `Urgent: Fee of Rs.${amount} is now 7 days overdue. Please clear it immediately to avoid academic disruption.`,
      type: "FEE" as NotificationType,
    };
  },

  // Trigger 4: Fee Overdue Day 7 Escalation (Principal)
  feeOverduePrincipal(studentName: string, amount: number) {
    return {
      title: "Fee Overdue Alert",
      content: `Fee invoice for ${studentName} (Rs.${amount}) is 7 days overdue. Status updated to OVERDUE.`,
      type: "FEE" as NotificationType,
    };
  },

  // Trigger 5: Attendance Milestone 75% (Parent)
  attendanceMilestoneParent(childName: string) {
    return {
      title: "⚠️ Promotion Risk Warning",
      content: `⚠️ ${childName}'s attendance has reached 75%. Attendance below 75% may affect promotion. Please ensure regular attendance.`,
      type: "ATTENDANCE" as NotificationType,
    };
  },

  // Trigger 5: Attendance Milestone 75% (Teacher & Principal)
  attendanceMilestoneStaff(studentName: string) {
    return {
      title: "Attendance Milestone Alert",
      content: `${studentName} has reached 75% attendance. Promotion risk flagged.`,
      type: "ATTENDANCE" as NotificationType,
    };
  },

  // Trigger 6: New Announcement
  newAnnouncement(title: string, contentPreview: string) {
    return {
      title: `Announcement: ${title}`,
      content: contentPreview,
      type: "ANNOUNCEMENT" as NotificationType,
    };
  },

  // Trigger 7: Exam Scheduled
  examScheduled(subjectName: string, date: string, className: string, total: number, passing: number) {
    return {
      title: `📝 Exam Scheduled: ${subjectName}`,
      content: `📝 Exam Scheduled: ${subjectName}\nDate: ${date} | Class: ${className}\nTotal Marks: ${total} | Passing: ${passing}\nStart preparing now!`,
      type: "GENERAL" as NotificationType,
    };
  },
};
