import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ParentDashboardClient from "./ParentDashboardClient";

interface PageProps {
  searchParams: {
    childId?: string;
  };
}

export default async function ParentDashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch parent profiles linking to child students
  const parents = await db.parent.findMany({
    where: { userId },
    include: {
      student: {
        include: {
          class: {
            include: {
              school: true,
            },
          },
        },
      },
    },
  });

  if (parents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white p-6 glass-card rounded-2xl max-w-xl mx-auto mt-12 border-white/[0.08]">
        <h3 className="text-xl font-bold text-rose-400">No Student Linked</h3>
        <p className="text-sm text-gray-400 mt-2 text-center">
          No students are currently linked to your parent account. Please contact the school administration to link your child.
        </p>
      </div>
    );
  }

  // 2. Multi-Child Selection Strategy
  const cookieStore = cookies();
  const activeStudentId = searchParams.childId || cookieStore.get("selected_child_id")?.value || parents[0].studentId;
  
  // Validate selected ID is actually linked to this parent
  const activeParentRecord = parents.find((p) => p.studentId === activeStudentId) || parents[0];
  const activeStudent = activeParentRecord.student;
  
  // 3. Resolve active student stats and queries
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // Today's attendance
  const todayAttendance = await db.attendance.findFirst({
    where: {
      studentId: activeStudent.id,
      date: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  let todayStatus: "PRESENT" | "ABSENT" | "UNMARKED" = "UNMARKED";
  if (todayAttendance) {
    if (todayAttendance.status === "PRESENT" || todayAttendance.status === "LATE") {
      todayStatus = "PRESENT";
    } else if (todayAttendance.status === "ABSENT") {
      todayStatus = "ABSENT";
    }
  }

  // Month attendance stats
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthAttendances = await db.attendance.findMany({
    where: {
      studentId: activeStudent.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const presentCount = monthAttendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "LEAVE"
  ).length;
  const totalSchoolDays = monthAttendances.length;
  const percentage = totalSchoolDays > 0 ? Math.round((presentCount / totalSchoolDays) * 100) : 100;

  // Active Assignments
  const assignments = await db.assignment.findMany({
    where: {
      classId: activeStudent.classId,
      isActive: true,
    },
    include: {
      submissions: {
        where: {
          studentId: activeStudent.id,
        },
      },
    },
  });

  const pendingAssignments = assignments.filter((a) => a.submissions.length === 0);
  const pendingCount = pendingAssignments.length;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dueThisWeekCount = pendingAssignments.filter((a) => {
    const due = new Date(a.dueDate);
    return due >= today && due <= nextWeek;
  }).length;

  // Fee Status for Current Calendar Month
  const currentMonth = today.getMonth() + 1; // 1-indexed (e.g. May is 5)
  const currentYear = today.getFullYear();

  const fee = await db.fee.findFirst({
    where: {
      studentId: activeStudent.id,
      month: currentMonth,
      year: currentYear,
    },
  });

  let feeStats: { status: "PAID" | "PENDING" | "OVERDUE"; amount: number; dueDate: string | null } = {
    status: "PAID",
    amount: 0,
    dueDate: null,
  };

  if (fee) {
    feeStats = {
      status: fee.status as "PAID" | "PENDING" | "OVERDUE",
      amount: fee.amount,
      dueDate: fee.dueDate ? fee.dueDate.toISOString() : null,
    };
  }

  // Upcoming Exams
  const exams = await db.exam.findMany({
    where: {
      classId: activeStudent.classId,
      examDate: {
        gte: today,
        lte: nextWeek,
      },
    },
    include: {
      subject: true,
    },
    orderBy: {
      examDate: "asc",
    },
  });

  const nextExam =
    exams.length > 0
      ? {
          subjectName: exams[0].subject.name,
          examDate: exams[0].examDate.toISOString(),
          daysAway: Math.max(
            0,
            Math.ceil((new Date(exams[0].examDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          ),
          examType: exams[0].examType,
        }
      : null;

  // Unread messages count
  const unreadMessagesCount = await db.message.count({
    where: {
      receiverId: userId,
      isRead: false,
    },
  });

  // Recent chronological Activity Feed
  const feedAttendances = await db.attendance.findMany({
    where: { studentId: activeStudent.id },
    orderBy: { date: "desc" },
    take: 8,
  });

  const feedSubmissions = await db.submission.findMany({
    where: { studentId: activeStudent.id },
    include: {
      assignment: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 8,
  });

  const feedExamResults = await db.examResult.findMany({
    where: { studentId: activeStudent.id },
    include: {
      exam: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const feedAnnouncements = await db.announcement.findMany({
    where: {
      isActive: true,
      targetRole: { in: ["ALL", "PARENT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const feedFees = await db.fee.findMany({
    where: {
      studentId: activeStudent.id,
      status: "PAID",
    },
    orderBy: { paidAt: "desc" },
    take: 8,
  });

  const activitiesList: any[] = [];

  feedAttendances.forEach((att) => {
    activitiesList.push({
      id: `att-${att.id}`,
      type: "Attendance",
      title: `Attendance marked ${
        att.status === "PRESENT" ? "Present" : att.status === "ABSENT" ? "Absent" : att.status === "LATE" ? "Late" : "Excused"
      }`,
      subtitle: att.note || "Daily morning attendance roll call check-in.",
      date: new Date(att.date),
      iconType: "attendance",
    });
  });

  feedSubmissions.forEach((sub) => {
    activitiesList.push({
      id: `sub-${sub.id}`,
      type: "Assignment",
      title: `"${sub.assignment.title}" assignment submitted`,
      subtitle: `Subject: ${sub.assignment.subject.name} • Status: ${sub.status}`,
      date: new Date(sub.submittedAt || sub.createdAt),
      iconType: "submission",
    });
  });

  feedExamResults.forEach((res) => {
    activitiesList.push({
      id: `res-${res.id}`,
      type: "Exam Result",
      title: `${res.exam.title} result published`,
      subtitle: `Score: ${res.marksObtained}/${res.exam.totalMarks} • Grade: ${res.grade || "N/A"} (${res.remarks || "No remarks"})`,
      date: new Date(res.createdAt),
      iconType: "grade",
    });
  });

  feedAnnouncements.forEach((ann) => {
    activitiesList.push({
      id: `ann-${ann.id}`,
      type: "Announcement",
      title: `New announcement: "${ann.title}"`,
      subtitle: ann.content.substring(0, 80) + (ann.content.length > 80 ? "..." : ""),
      date: new Date(ann.createdAt),
      iconType: "announcement",
    });
  });

  feedFees.forEach((f) => {
    activitiesList.push({
      id: `fee-${f.id}`,
      type: "Fee Payment",
      title: `Fee payment received`,
      subtitle: `Receipt: #${f.receiptNumber || "N/A"} • Amount: Rs. ${f.amount.toLocaleString()}`,
      date: new Date(f.paidAt || f.updatedAt),
      iconType: "fee",
    });
  });

  const activities = activitiesList
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8)
    .map((act) => ({
      id: act.id,
      type: act.type,
      title: act.title,
      subtitle: act.subtitle,
      dateString: act.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      iconType: act.iconType,
    }));

  // Upcoming Agenda Week
  const upcomingWeekList: any[] = [];

  exams.forEach((ex) => {
    upcomingWeekList.push({
      id: `exam-${ex.id}`,
      type: "exam",
      title: `${ex.subject.name} - ${ex.title}`,
      subtitle: `Time: ${ex.startTime} - ${ex.endTime} (${ex.totalMarks} Marks)`,
      date: new Date(ex.examDate),
      colorType: "purple",
    });
  });

  const weekAssignments = assignments.filter((a) => {
    const due = new Date(a.dueDate);
    return due >= today && due <= nextWeek;
  });

  weekAssignments.forEach((a) => {
    const hasSubmitted = a.submissions.some((sub) => sub.studentId === activeStudent.id);
    upcomingWeekList.push({
      id: `assign-${a.id}`,
      type: "assignment",
      title: `${a.title}`,
      subtitle: `Due date for homework submission (Marks: ${a.totalMarks})${hasSubmitted ? " • Submitted" : ""}`,
      date: new Date(a.dueDate),
      colorType: "blue",
    });
  });

  // Mock school event
  const ptmDate = new Date();
  ptmDate.setDate(ptmDate.getDate() + 4);
  upcomingWeekList.push({
    id: "event-ptm",
    type: "event",
    title: "Parent-Teacher Meeting (PTM)",
    subtitle: "Discussing student performance worksheets, grade updates and reports.",
    date: ptmDate,
    colorType: "emerald",
  });

  const upcomingWeek = upcomingWeekList
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      dateString: item.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      colorType: item.colorType,
    }));

  // Map student info
  const studentsInfo = parents.map((p) => ({
    id: p.student.id,
    name: p.student.name,
    rollNumber: p.student.rollNumber,
    className: p.student.class?.name || "Grade N/A",
    section: p.student.class?.section || "N/A",
    photo: p.student.photo,
    schoolName: p.student.class?.school?.name || "Al-Noor School",
  }));

  return (
    <ParentDashboardClient
      parentName={session.user.name || "Parent"}
      students={studentsInfo}
      activeStudentId={activeStudent.id}
      todayStatus={todayStatus}
      monthStats={{
        presentCount,
        totalSchoolDays,
        percentage,
      }}
      assignmentsStats={{
        pendingCount,
        dueThisWeekCount,
      }}
      feeStats={feeStats}
      nextExam={nextExam}
      activities={activities}
      upcomingWeek={upcomingWeek}
      unreadMessagesCount={unreadMessagesCount}
    />
  );
}
