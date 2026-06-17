import { unstable_cache } from "next/cache";
import { db } from "./db";

// 1. School info → 1 hour (3600 seconds)
export const getSchoolInfo = unstable_cache(
  async (schoolId: string) => {
    return db.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        logo: true,
        website: true,
        establishedYear: true,
        academicYear: true,
        currentTerm: true,
      },
    });
  },
  ["school-info"],
  { revalidate: 3600, tags: ["school"] }
);

// 2. Class list → 30 minutes (1800 seconds)
export const getClassList = unstable_cache(
  async (schoolId: string) => {
    return db.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        section: true,
        gradeLevel: true,
        capacity: true,
        classTeacherId: true,
      },
      orderBy: [
        { gradeLevel: "asc" },
        { name: "asc" },
        { section: "asc" },
      ],
    });
  },
  ["class-list"],
  { revalidate: 1800, tags: ["classes"] }
);

// 3. Subject list → 30 minutes (1800 seconds)
export const getSubjectList = unstable_cache(
  async (schoolId: string) => {
    return db.subject.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        gradeLevel: true,
        isCompulsory: true,
      },
      orderBy: { name: "asc" },
    });
  },
  ["subject-list"],
  { revalidate: 1800, tags: ["subjects"] }
);

// 4. Teacher list → 15 minutes (900 seconds)
export const getTeacherList = unstable_cache(
  async (schoolId: string) => {
    return db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        employeeId: true,
        isClassTeacher: true,
        qualification: true,
        specialization: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
      },
      orderBy: { employeeId: "asc" },
    });
  },
  ["teacher-list"],
  { revalidate: 900, tags: ["teachers"] }
);

// 5. Student stats → 5 minutes (300 seconds)
export const getStudentStats = unstable_cache(
  async (schoolId: string) => {
    const [total, active, inactive] = await Promise.all([
      db.student.count({ where: { schoolId } }),
      db.student.count({ where: { schoolId, isActive: true } }),
      db.student.count({ where: { schoolId, isActive: false } }),
    ]);
    return { total, active, inactive };
  },
  ["student-stats"],
  { revalidate: 300, tags: ["students"] }
);

// 6. Attendance today → 1 minute (60 seconds)
export const getAttendanceToday = unstable_cache(
  async (schoolId: string, dateStr: string) => {
    const date = new Date(dateStr);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const records = await db.attendance.findMany({
      where: {
        student: { schoolId },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        status: true,
        studentId: true,
      },
    });

    const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const leave = records.filter((r) => r.status === "LEAVE").length;
    const total = records.length;

    return {
      present,
      absent,
      leave,
      total,
      rate: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100,
    };
  },
  ["attendance-today"],
  { revalidate: 60, tags: ["attendance"] }
);

// 7. Fee stats → 5 minutes (300 seconds)
export const getFeeStats = unstable_cache(
  async (schoolId: string, month: number, year: number) => {
    const aggregate = await db.fee.aggregate({
      where: { schoolId, month, year },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalCount = await db.fee.count({ where: { schoolId, month, year } });
    const paidCount = await db.fee.count({ where: { schoolId, month, year, status: "PAID" } });
    const pendingCount = await db.fee.count({ where: { schoolId, month, year, status: "PENDING" } });
    const overdueCount = await db.fee.count({ where: { schoolId, month, year, status: "OVERDUE" } });

    const totalExpected = aggregate._sum.amount || 0;
    const totalCollected = aggregate._sum.paidAmount || 0;

    return {
      totalExpected,
      totalCollected,
      collectionRate: totalExpected > 0 ? parseFloat(((totalCollected / totalExpected) * 100).toFixed(1)) : 0,
      totalCount,
      paidCount,
      pendingCount,
      overdueCount,
    };
  },
  ["fee-stats"],
  { revalidate: 300, tags: ["fees"] }
);
