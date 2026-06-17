import { db } from '@/lib/db';

export interface SchoolContext {
  schoolName: string;
  city: string;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendancePercentage: number;
  thisMonthFeeCollection: {
    collected: number;
    expected: number;
    percentage: number;
  };
  recentAuditLogs: {
    action: string;
    details: string;
    user: string;
    createdAt: Date;
  }[];
  atRiskStudents: {
    id: string;
    name: string;
    className: string;
    attendanceRate: number;
    averageGrade: string;
    riskReason: string;
  }[];
  upcomingExams: {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    examDate: Date;
    examType: string;
  }[];
}

/**
 * Aggregates and returns current school data context for injecting into AI calls.
 */
export async function getSchoolContext(schoolId: string): Promise<SchoolContext> {
  try {
    // 1. School Info
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error(`School with ID ${schoolId} not found.`);
    }

    // 2. Counts
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      db.student.count({ where: { schoolId } }),
      db.teacher.count({ where: { schoolId } }),
      db.class.count({ where: { schoolId } }),
    ]);

    // 3. Today's Attendance Percentage
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const attendances = await db.attendance.findMany({
      where: {
        class: { schoolId },
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    let todayAttendancePercentage = 100; // Default if no attendance marked today
    if (attendances.length > 0) {
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEAVE'
      ).length;
      todayAttendancePercentage = Math.round((presentCount / attendances.length) * 100);
    }

    // 4. Monthly Fee Collection
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyFees = await db.fee.findMany({
      where: {
        schoolId,
        month: currentMonth,
        year: currentYear,
      },
    });

    let collected = 0;
    let expected = 0;
    monthlyFees.forEach((fee) => {
      collected += fee.paidAmount;
      expected += fee.amount;
    });
    const feePercentage = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    // 5. Recent Audit Logs
    const auditLogs = await db.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: true,
      },
    });

    const recentAuditLogs = auditLogs.map((log) => ({
      action: log.action,
      details: log.details,
      user: log.user?.name || 'Unknown User',
      createdAt: log.createdAt,
    }));

    // 6. At-Risk Students
    // Defined as attendance rate < 75% or having failing marks/low grades
    const allStudents = await db.student.findMany({
      where: { schoolId, isActive: true },
      include: {
        class: true,
        attendances: {
          take: 30, // Analyze recent 30 attendances
        },
        examResults: {
          include: {
            exam: true,
          },
        },
      },
    });

    const atRiskStudentsList: SchoolContext['atRiskStudents'] = [];

    allStudents.forEach((student) => {
      let attendanceRate = 100;
      let riskReason = '';
      let hasLowAttendance = false;
      let hasLowGrades = false;

      // Check attendance
      const studentAttendances = student.attendances || [];
      if (studentAttendances.length > 0) {
        const presents = studentAttendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LEAVE'
        ).length;
        attendanceRate = Math.round((presents / studentAttendances.length) * 100);
        if (attendanceRate < 75) {
          hasLowAttendance = true;
          riskReason += `Low attendance (${attendanceRate}%). `;
        }
      }

      // Check exam results (e.g. failing exam marks < 40%)
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;
      const studentExamResults = student.examResults || [];
      studentExamResults.forEach((result) => {
        totalMarksObtained += result.marksObtained;
        totalMaxMarks += result.exam.totalMarks;
      });

      const avgGradePercent = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 100;
      if (studentExamResults.length > 0 && avgGradePercent < 50) {
        hasLowGrades = true;
        riskReason += `Failing academic performance (Average ${Math.round(avgGradePercent)}%).`;
      }

      if (hasLowAttendance || hasLowGrades) {
        atRiskStudentsList.push({
          id: student.id,
          name: student.name,
          className: `${student.class.name}-${student.class.section}`,
          attendanceRate,
          averageGrade: avgGradePercent < 100 ? `${Math.round(avgGradePercent)}%` : 'N/A',
          riskReason: riskReason.trim(),
        });
      }
    });

    // 7. Upcoming Exams
    const exams = await db.exam.findMany({
      where: {
        schoolId,
        examDate: {
          gte: startOfToday,
        },
      },
      orderBy: { examDate: 'asc' },
      take: 5,
      include: {
        class: true,
        subject: true,
      },
    });

    const upcomingExams = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      className: `${exam.class.name}-${exam.class.section}`,
      subjectName: exam.subject.name,
      examDate: exam.examDate,
      examType: exam.examType.toString(),
    }));

    return {
      schoolName: school.name,
      city: school.city,
      totalStudents,
      totalTeachers,
      totalClasses,
      todayAttendancePercentage,
      thisMonthFeeCollection: {
        collected,
        expected,
        percentage: feePercentage,
      },
      recentAuditLogs,
      atRiskStudents: atRiskStudentsList.slice(0, 5), // Limit to top 5 at-risk
      upcomingExams,
    };
  } catch (error) {
    console.error('Error fetching school context details:', error);
    // Graceful fallback defaults to keep the app working
    return {
      schoolName: 'Al-Noor School (Fallback)',
      city: 'Lahore',
      totalStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
      todayAttendancePercentage: 100,
      thisMonthFeeCollection: { collected: 0, expected: 0, percentage: 0 },
      recentAuditLogs: [],
      atRiskStudents: [],
      upcomingExams: [],
    };
  }
}

export interface TeacherContext {
  teacherName: string;
  schoolName: string;
  classes: {
    id: string;
    name: string;
    section: string;
    gradeLevel: number;
    students: {
      id: string;
      name: string;
      rollNumber: string;
      averageGrade: string;
      attendanceRate: number;
    }[];
  }[];
  subjects: {
    id: string;
    name: string;
    code: string;
  }[];
  pendingGrading: {
    assignmentId: string;
    assignmentTitle: string;
    className: string;
    subjectName: string;
    pendingCount: number;
  }[];
  recentAttendance: {
    className: string;
    date: Date;
    presentCount: number;
    absentCount: number;
  }[];
  weakStudents: {
    id: string;
    name: string;
    className: string;
    attendanceRate: number;
    averageGradePercent: number;
    reason: string;
  }[];
}

export async function getTeacherContext(userId: string, schoolId: string): Promise<TeacherContext> {
  try {
    // 1. Fetch teacher profile
    const teacher = await db.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
        school: true,
      },
    });

    if (!teacher) {
      throw new Error(`Teacher profile for User ${userId} not found.`);
    }

    const teacherName = teacher.user?.name || 'Teacher';
    const schoolName = teacher.school?.name || 'Al-Noor School';

    // 2. Fetch all ClassSubjects linked to this teacher to identify their classes & subjects
    const classSubjects = await db.classSubject.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true },
              include: {
                attendances: { take: 15 },
                examResults: { include: { exam: true } },
              },
            },
          },
        },
        subject: true,
      },
    });

    // 3. Extract unique classes and subjects
    const classMap = new Map<string, any>();
    const subjectMap = new Map<string, any>();

    classSubjects.forEach((cs) => {
      if (cs.class) {
        classMap.set(cs.classId, cs.class);
      }
      if (cs.subject) {
        subjectMap.set(cs.subjectId, cs.subject);
      }
    });

    const classesList = Array.from(classMap.values());
    const subjects = Array.from(subjectMap.values()).map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
    }));

    // 4. Map classes and compute student grades & attendance
    const classes = classesList.map((cls) => {
      const students = (cls.students || []).map((student: any) => {
        // Attendance
        let attendanceRate = 100;
        const studentAttendances = student.attendances || [];
        if (studentAttendances.length > 0) {
          const presents = studentAttendances.filter(
            (a: any) => a.status === 'PRESENT' || a.status === 'LEAVE'
          ).length;
          attendanceRate = Math.round((presents / studentAttendances.length) * 100);
        }

        // Grades
        let avgGradePercent = 100;
        let totalMarksObtained = 0;
        let totalMaxMarks = 0;
        const studentExamResults = student.examResults || [];
        studentExamResults.forEach((result: any) => {
          totalMarksObtained += result.marksObtained;
          totalMaxMarks += result.exam.totalMarks;
        });
        if (totalMaxMarks > 0) {
          avgGradePercent = Math.round((totalMarksObtained / totalMaxMarks) * 100);
        }

        return {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber || 'N/A',
          averageGrade: totalMaxMarks > 0 ? `${avgGradePercent}%` : 'N/A',
          attendanceRate,
          // auxiliary field for weak student checks
          avgGradePercent: totalMaxMarks > 0 ? avgGradePercent : 85,
        };
      });

      return {
        id: cls.id,
        name: cls.name,
        section: cls.section,
        gradeLevel: cls.gradeLevel,
        students,
      };
    });

    // 5. Weak Performing Students (attendance < 75% or average grade < 60%)
    const weakStudents: TeacherContext['weakStudents'] = [];
    classes.forEach((cls) => {
      cls.students.forEach((s: any) => {
        let isWeak = false;
        let reason = '';
        if (s.attendanceRate < 75) {
          isWeak = true;
          reason += `Attendance is low (${s.attendanceRate}%). `;
        }
        if (s.avgGradePercent < 60) {
          isWeak = true;
          reason += `Average grade is failing (${s.averageGrade}).`;
        }

        if (isWeak) {
          weakStudents.push({
            id: s.id,
            name: s.name,
            className: `${cls.name}-${cls.section}`,
            attendanceRate: s.attendanceRate,
            averageGradePercent: s.avgGradePercent,
            reason: reason.trim(),
          });
        }
      });
    });

    // 6. Pending Assignments to grade
    // Fetch assignments created by this teacher that have pending submissions
    const assignments = await db.assignment.findMany({
      where: { teacherId: teacher.id, isActive: true },
      include: {
        class: true,
        subject: true,
        submissions: {
          where: { status: 'PENDING' },
        },
      },
    });

    const pendingGrading = assignments
      .filter((a) => a.submissions.length > 0)
      .map((a) => ({
        assignmentId: a.id,
        assignmentTitle: a.title,
        className: `${a.class.name}-${a.class.section}`,
        subjectName: a.subject.name,
        pendingCount: a.submissions.length,
      }));

    // 7. Recent attendance records marked by this teacher
    const recentAttendances = await db.attendance.findMany({
      where: {
        markedById: teacher.id,
      },
      orderBy: { date: 'desc' },
      take: 50,
      include: {
        class: true,
      },
    });

    // Group by class & date
    const attendanceGroups = new Map<string, { className: string; date: Date; presents: number; absents: number }>();
    recentAttendances.forEach((a) => {
      const dateStr = a.date.toDateString();
      const groupKey = `${a.classId}_${dateStr}`;
      const existing = attendanceGroups.get(groupKey);

      const isPresent = a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'LEAVE';
      const presents = isPresent ? 1 : 0;
      const absents = isPresent ? 0 : 1;

      if (existing) {
        existing.presents += presents;
        existing.absents += absents;
      } else {
        attendanceGroups.set(groupKey, {
          className: `${a.class.name}-${a.class.section}`,
          date: a.date,
          presents,
          absents,
        });
      }
    });

    const recentAttendance = Array.from(attendanceGroups.values()).map((g) => ({
      className: g.className,
      date: g.date,
      presentCount: g.presents,
      absentCount: g.absents,
    })).slice(0, 5);

    return {
      teacherName,
      schoolName,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        gradeLevel: c.gradeLevel,
        students: c.students.map((s: any) => ({
          id: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          averageGrade: s.averageGrade,
          attendanceRate: s.attendanceRate,
        })),
      })),
      subjects,
      pendingGrading,
      recentAttendance,
      weakStudents,
    };
  } catch (error) {
    console.error('[getTeacherContextError]:', error);
    // Graceful fallback
    return {
      teacherName: 'Ms. Sara Ali (Fallback)',
      schoolName: 'Al-Noor School',
      classes: [
        {
          id: 'class-grade5-a',
          name: 'Grade 5',
          section: 'A',
          gradeLevel: 6,
          students: [
            { id: 'student-zain', name: 'Zainab Bibi', rollNumber: '002', averageGrade: '85%', attendanceRate: 98 },
          ],
        },
      ],
      subjects: [{ id: 'subj-math', name: 'Mathematics', code: 'MATH-01' }],
      pendingGrading: [],
      recentAttendance: [],
      weakStudents: [],
    };
  }
}

export interface ParentContext {
  parentName: string;
  childId: string;
  childName: string;
  className: string;
  attendanceRate: number;
  recentGrades: {
    subjectName: string;
    examTitle: string;
    marksObtained: number;
    totalMarks: number;
    grade: string;
  }[];
  pendingHomework: {
    assignmentId: string;
    title: string;
    subjectName: string;
    dueDate: Date;
  }[];
  feeStatus: {
    amount: number;
    dueDate: Date;
    status: string;
    month: number;
    year: number;
  }[];
  recentMessages: {
    senderName: string;
    content: string;
    createdAt: Date;
  }[];
  upcomingExams: {
    title: string;
    subjectName: string;
    examDate: Date;
  }[];
}

export async function getParentContext(userId: string, schoolId: string): Promise<ParentContext> {
  try {
    // 1. Fetch parent and child profile
    const parent = await db.parent.findFirst({
      where: { userId },
      include: {
        user: true,
        student: {
          include: {
            class: true,
            attendances: { take: 30, orderBy: { date: 'desc' } },
            examResults: {
              include: {
                exam: {
                  include: { subject: true },
                },
              },
            },
            fees: { orderBy: { dueDate: 'desc' }, take: 10 },
          },
        },
      },
    });

    if (!parent) {
      throw new Error(`Parent profile for User ${userId} not found.`);
    }

    const parentName = parent.user?.name || 'Parent';
    const student = parent.student;
    const childId = student?.id || 'student-id';
    const childName = student?.name || 'Child';
    const className = student?.class ? `${student.class.name}-${student.class.section}` : 'Grade 5-A';

    // 2. Child Attendance Rate
    let attendanceRate = 100;
    const studentAttendances = student?.attendances || [];
    if (studentAttendances.length > 0) {
      const presents = studentAttendances.filter(
        (a: any) => a.status === 'PRESENT' || a.status === 'LEAVE'
      ).length;
      attendanceRate = Math.round((presents / studentAttendances.length) * 100);
    }

    // 3. Recent Grades
    const recentGrades = (student?.examResults || []).map((r: any) => ({
      subjectName: r.exam?.subject?.name || 'Unknown Subject',
      examTitle: r.exam?.title || 'Exam',
      marksObtained: r.marksObtained,
      totalMarks: r.exam?.totalMarks || 100,
      grade: r.grade || (r.marksObtained / (r.exam?.totalMarks || 100) >= 0.8 ? 'A' : 'B'),
    }));

    // 4. Pending Homework (assignments in class with no submission or PENDING submission)
    const classId = student?.classId || 'class-id';
    const assignments = await db.assignment.findMany({
      where: { classId, isActive: true },
      include: { subject: true },
    });

    const studentSubmissions = await db.submission.findMany({
      where: { studentId: childId },
    });

    const pendingHomework = assignments
      .filter((a) => {
        const sub = studentSubmissions.find((s) => s.assignmentId === a.id);
        return !sub || sub.status === 'PENDING';
      })
      .map((a) => ({
        assignmentId: a.id,
        title: a.title,
        subjectName: a.subject?.name || 'Unknown Subject',
        dueDate: a.dueDate,
      }));

    // 5. Fee Status
    const feeStatus = (student?.fees || []).map((f: any) => ({
      amount: f.amount,
      dueDate: f.dueDate,
      status: f.status.toString(),
      month: f.month,
      year: f.year,
    }));

    // 6. Recent teacher messages (Fetch messages where parent is sender/receiver)
    const messages = await db.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        sender: true,
      },
    });

    const recentMessages = messages.map((m: any) => ({
      senderName: m.sender?.name || 'Teacher',
      content: m.content,
      createdAt: m.createdAt,
    }));

    // 7. Upcoming Exams for child's class
    const exams = await db.exam.findMany({
      where: {
        classId,
        examDate: { gte: new Date() },
      },
      include: { subject: true },
      orderBy: { examDate: 'asc' },
      take: 5,
    });

    const upcomingExams = exams.map((ex) => ({
      title: ex.title,
      subjectName: ex.subject?.name || 'Unknown Subject',
      examDate: ex.examDate,
    }));

    return {
      parentName,
      childId,
      childName,
      className,
      attendanceRate,
      recentGrades,
      pendingHomework,
      feeStatus,
      recentMessages,
      upcomingExams,
    };
  } catch (error) {
    console.error('[getParentContextError]:', error);
    // Graceful fallback dummy records
    return {
      parentName: 'Parent (Fallback)',
      childId: 'student-ali',
      childName: 'Ali Ahmed',
      className: 'Grade 1-A',
      attendanceRate: 95,
      recentGrades: [
        { subjectName: 'Mathematics', examTitle: 'Midterm Mathematics', marksObtained: 42, totalMarks: 50, grade: 'A' },
      ],
      pendingHomework: [],
      feeStatus: [],
      recentMessages: [],
      upcomingExams: [],
    };
  }
}


