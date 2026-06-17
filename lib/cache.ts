import { unstable_cache } from 'next/cache'
import prisma from './db'

// School Stats - cache 5 minutes
export const getSchoolStats = unstable_cache(
  async (schoolId: string) => {
    const [students, teachers, classes] = 
      await Promise.all([
        prisma.student.count({
          where: { schoolId, isActive: true }
        }),
        prisma.teacher.count({
          where: { schoolId }
        }),
        prisma.class.count({
          where: { schoolId }
        }),
      ])
    return { students, teachers, classes }
  },
  ['school-stats'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['school-stats'] 
  }
)

// Classes List - cache 30 minutes
export const getClassesList = unstable_cache(
  async (schoolId: string) => {
    return prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        section: true,
        gradeLevel: true,
        capacity: true,
        _count: {
          select: { students: true }
        },
        classTeacher: {
          select: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [
        { gradeLevel: 'asc' },
        { section: 'asc' }
      ]
    })
  },
  ['classes-list'],
  { 
    revalidate: 1800, // 30 minutes
    tags: ['classes'] 
  }
)

// Students List - cache 5 minutes
export const getStudentsList = unstable_cache(
  async (schoolId: string, page = 1, 
         limit = 25) => {
    const skip = (page - 1) * limit
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: { schoolId, isActive: true },
        select: {
          id: true,
          name: true,
          rollNumber: true,
          admissionNumber: true,
          gender: true,
          photo: true,
          class: {
            select: { 
              name: true, 
              section: true 
            }
          },
          parents: {
            select: {
              user: {
                select: { phone: true, name: true }
              }
            },
            take: 1
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.student.count({
        where: { schoolId, isActive: true }
      })
    ])
    return { 
      students, 
      total,
      totalPages: Math.ceil(total / limit)
    }
  },
  ['students-list'],
  { 
    revalidate: 300,
    tags: ['students'] 
  }
)

// Teachers List - cache 15 minutes
export const getTeachersList = unstable_cache(
  async (schoolId: string) => {
    return prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        employeeId: true,
        qualification: true,
        specialization: true,
        joiningDate: true,
        isClassTeacher: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isActive: true
          }
        },
        managedClass: {
          select: { name: true, section: true }
        },
        classSubjects: {
          select: {
            subject: { select: { name: true } },
            class: { 
              select: { 
                name: true, 
                section: true 
              } 
            }
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    })
  },
  ['teachers-list'],
  { 
    revalidate: 900,
    tags: ['teachers'] 
  }
)

// Today Attendance - cache 1 minute
export const getTodayAttendance = unstable_cache(
  async (schoolId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [present, total] = await Promise.all([
      prisma.attendance.count({
        where: {
          class: { schoolId },
          date: { gte: today },
          status: 'PRESENT'
        }
      }),
      prisma.student.count({
        where: { schoolId, isActive: true }
      })
    ])
    
    const percentage = total > 0 
      ? Math.round((present / total) * 100) 
      : 0
    return { present, total, percentage }
  },
  ['today-attendance'],
  { 
    revalidate: 60, // 1 minute only
    tags: ['attendance'] 
  }
)

// Announcements - cache 10 minutes
export const getAnnouncements = unstable_cache(
  async (schoolId: string, limit = 5) => {
    return prisma.announcement.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        title: true,
        content: true,
        targetRole: true,
        createdAt: true,
        createdBy: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },
  ['announcements'],
  { 
    revalidate: 600,
    tags: ['announcements'] 
  }
)

// Fee Stats - cache 5 minutes
export const getFeeStats = unstable_cache(
  async (schoolId: string) => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    
    const fees = await prisma.fee.groupBy({
      by: ['status'],
      where: { schoolId, month, year },
      _sum: { 
        amount: true, 
        paidAmount: true 
      },
      _count: true
    })
    
    return fees
  },
  ['fee-stats'],
  { 
    revalidate: 300,
    tags: ['fees'] 
  }
)

// Recent Audit Logs - cache 2 minutes
export const getRecentAuditLogs = unstable_cache(
  async (schoolId: string) => {
    return prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: { select: { name: true, role: true } },
      },
    })
  },
  ['recent-audit-logs'],
  {
    revalidate: 120, // 2 minutes
    tags: ['audit-logs']
  }
)

// Upcoming Exams - cache 10 minutes
export const getUpcomingExams = unstable_cache(
  async (schoolId: string) => {
    const now = new Date()
    return prisma.exam.findMany({
      where: {
        schoolId,
        examDate: { gte: now },
      },
      orderBy: { examDate: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        examDate: true,
        examType: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
    })
  },
  ['upcoming-exams'],
  {
    revalidate: 600, // 10 minutes
    tags: ['exams']
  }
)

// At-Risk Students - cache 10 minutes
export const getAtRiskStudents = unstable_cache(
  async (schoolId: string) => {
    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const students = await prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        class: { select: { name: true, section: true } },
        attendances: {
          where: {
            date: { gte: monthStart, lt: todayEnd },
          },
          select: { status: true },
        },
      },
    })

    return students
      .map((student) => {
        const total = student.attendances.length
        const present = student.attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length
        const pct = total > 0 ? Math.round((present / total) * 100) : null
        return {
          id: student.id,
          name: student.name,
          attendancePct: pct,
          class: student.class ? { name: student.class.name, section: student.class.section } : null
        }
      })
      .filter((s) => s.attendancePct !== null && s.attendancePct < 75)
      .slice(0, 5)
  },
  ['at-risk-students'],
  {
    revalidate: 600, // 10 minutes
    tags: ['students', 'attendance']
  }
)
