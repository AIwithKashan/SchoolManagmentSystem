import "./env-check";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma;
} else {
  let connectionString = process.env.DATABASE_URL || "";
  
  // If connection string is missing or contains placeholder tokens, use a safe dummy format for build time
  if (!connectionString || connectionString.includes("[password]") || connectionString.includes("[project-ref]")) {
    connectionString = "postgresql://postgres:postgres@localhost:5432/postgres";
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false
    }
  });
  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;

const globalForMock = globalThis as unknown as {
  useMock: boolean | undefined;
  store: Record<string, any[]> | undefined;
};

// ─── IN-MEMORY DATA STORE FOR FALLBACK MOCKING ─────────────────────────
const HASHED_PASSWORDS = {
  principal: hashSync("Principal123", 10),
  teacher: hashSync("Teacher123", 10),
  parent: hashSync("Parent123", 10),
};

if (!globalForMock.store) {
  globalForMock.store = {
    user: [
      {
        id: "principal-id",
        email: "principal@edumind.com",
        password: HASHED_PASSWORDS.principal,
        role: "PRINCIPAL",
        name: "Mr. Ahmed Khan",
        phone: "0300-1234567",
        avatar: null,
        isActive: true,
      },
      {
        id: "teacher-id",
        email: "teacher@edumind.com",
        password: HASHED_PASSWORDS.teacher,
        role: "TEACHER",
        name: "Ms. Sara Ali",
        phone: "0301-2345678",
        avatar: null,
        isActive: true,
      },
      {
        id: "parent-id",
        email: "parent@edumind.com",
        password: HASHED_PASSWORDS.parent,
        role: "PARENT",
        name: "Mr. Bilal Ahmed",
        phone: "0302-3456789",
        avatar: null,
        isActive: true,
      },
    ],
    school: [
      {
        id: "school-id",
        name: "Al-Noor School",
        address: "123 Education Street, Gulberg",
        city: "Lahore",
        phone: "042-35761234",
        email: "info@alnoor.edu.pk",
        academicYear: "2025-2026",
        currentTerm: "First Term",
        principalId: "principal-id",
      },
    ],
    teacher: [
      {
        id: "teacher-profile-id",
        userId: "teacher-id",
        schoolId: "school-id",
        employeeId: "TCH-001",
        qualification: "M.Ed",
        specialization: "Mathematics",
        joiningDate: new Date("2023-01-15"),
        salary: 45000,
        isClassTeacher: true,
        managedClassId: "class-grade1-a",
      },
    ],
    class: [
      { id: "class-nursery-a", name: "Nursery", section: "A", gradeLevel: 0, schoolId: "school-id", capacity: 30 },
      { id: "class-nursery-b", name: "Nursery", section: "B", gradeLevel: 0, schoolId: "school-id", capacity: 30 },
      { id: "class-prep-a", name: "Prep", section: "A", gradeLevel: 1, schoolId: "school-id", capacity: 30 },
      { id: "class-prep-b", name: "Prep", section: "B", gradeLevel: 1, schoolId: "school-id", capacity: 30 },
      { id: "class-grade1-a", name: "Grade 1", section: "A", gradeLevel: 2, schoolId: "school-id", capacity: 30 },
      { id: "class-grade1-b", name: "Grade 1", section: "B", gradeLevel: 2, schoolId: "school-id", capacity: 30 },
      { id: "class-grade5-a", name: "Grade 5", section: "A", gradeLevel: 6, schoolId: "school-id", capacity: 30 },
      { id: "class-grade10-a", name: "Grade 10", section: "A", gradeLevel: 11, schoolId: "school-id", capacity: 30 },
    ],
    subject: [
      { id: "subj-math", name: "Mathematics", code: "MATH-01", gradeLevel: 2, schoolId: "school-id", isCompulsory: true },
      { id: "subj-eng", name: "English", code: "ENG-01", gradeLevel: 2, schoolId: "school-id", isCompulsory: true },
      { id: "subj-sci", name: "Science", code: "SCI-01", gradeLevel: 2, schoolId: "school-id", isCompulsory: true },
      { id: "subj-urd", name: "Urdu", code: "URD-01", gradeLevel: 2, schoolId: "school-id", isCompulsory: true },
      { id: "subj-isl", name: "Islamiat", code: "ISL-01", gradeLevel: 2, schoolId: "school-id", isCompulsory: true },
    ],
    student: [
      {
        id: "student-ali",
        name: "Ali Ahmed",
        rollNumber: "001",
        admissionNumber: "ADM-2025-001",
        dateOfBirth: new Date("2015-03-15"),
        gender: "MALE",
        classId: "class-grade1-a",
        schoolId: "school-id",
        admissionDate: new Date("2025-04-01"),
        isActive: true,
      },
      {
        id: "student-zain",
        name: "Zainab Bibi",
        rollNumber: "002",
        admissionNumber: "ADM-2025-002",
        dateOfBirth: new Date("2015-08-20"),
        gender: "FEMALE",
        classId: "class-grade5-a",
        schoolId: "school-id",
        admissionDate: new Date("2025-04-01"),
        isActive: true,
      },
      {
        id: "student-hamza",
        name: "Hamza Khan",
        rollNumber: "003",
        admissionNumber: "ADM-2025-003",
        dateOfBirth: new Date("2010-05-12"),
        gender: "MALE",
        classId: "class-grade10-a",
        schoolId: "school-id",
        admissionDate: new Date("2025-04-01"),
        isActive: true,
      },
    ],
    parent: [
      {
        id: "parent-profile-id",
        userId: "parent-id",
        studentId: "student-ali",
        relationship: "Father",
        occupation: "Engineer",
        cnic: "35202-1234567-1",
        schoolId: "school-id",
      },
      {
        id: "parent-profile-id-2",
        userId: "parent-id",
        studentId: "student-zain",
        relationship: "Father",
        occupation: "Engineer",
        cnic: "35202-1234567-1",
        schoolId: "school-id",
      },
    ],
    announcement: [
      {
        id: "announce-welcome",
        title: "Welcome to EduMind AI!",
        content: "Welcome to our new AI-powered school management system. We are excited to bring you this modern platform.",
        targetRole: "ALL",
        schoolId: "school-id",
        createdById: "principal-id",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    fee: [
      {
        id: "fee-sample-1",
        amount: 3000,
        paidAmount: 0,
        feeType: "TUITION",
        month: 6,
        year: 2026,
        dueDate: new Date("2026-06-10"),
        status: "PENDING",
        studentId: "student-ali",
        schoolId: "school-id",
        paidAt: null,
        receiptNumber: null,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    notification: [],
    classSubject: [
      { id: "cs-1", classId: "class-grade5-a", subjectId: "subj-math", teacherId: "teacher-profile-id" },
      { id: "cs-2", classId: "class-grade1-a", subjectId: "subj-math", teacherId: "teacher-profile-id" },
      { id: "cs-3", classId: "class-grade10-a", subjectId: "subj-urd", teacherId: "teacher-profile-id" },
    ],
    attendance: [
      {
        id: "att-1",
        studentId: "student-ali",
        classId: "class-grade1-a",
        date: new Date(),
        status: "PRESENT",
        markedById: "teacher-profile-id",
        note: "All good",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    assignment: [
      {
        id: "assign-math5",
        title: "Algebra Basics",
        description: "Solve exercises 1 to 5 on page 42.",
        schoolId: "school-id",
        classId: "class-grade5-a",
        subjectId: "subj-math",
        teacherId: "teacher-profile-id",
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        totalMarks: 20,
        attachmentUrl: null,
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "assign-math1",
        title: "Addition Fun",
        description: "Complete the practice sheet for addition.",
        schoolId: "school-id",
        classId: "class-grade1-a",
        subjectId: "subj-math",
        teacherId: "teacher-profile-id",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        totalMarks: 10,
        attachmentUrl: null,
        isActive: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
    submission: [
      {
        id: "sub-1",
        assignmentId: "assign-math5",
        studentId: "student-zain",
        content: "Here is my submission for the algebra homework.",
        attachmentUrl: null,
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        aiScore: null,
        teacherScore: null,
        aiFeedback: null,
        teacherFeedback: null,
        status: "PENDING",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
    exam: [
      {
        id: "exam-math5",
        title: "Midterm Mathematics",
        schoolId: "school-id",
        classId: "class-grade5-a",
        subjectId: "subj-math",
        examDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        startTime: "09:00 AM",
        endTime: "11:00 AM",
        totalMarks: 50,
        passingMarks: 20,
        examType: "MIDTERM",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "exam-urd10",
        title: "Quiz 2: Urdu Poetry",
        schoolId: "school-id",
        classId: "class-grade10-a",
        subjectId: "subj-urd",
        examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        startTime: "10:30 AM",
        endTime: "11:30 AM",
        totalMarks: 20,
        passingMarks: 8,
        examType: "QUIZ",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    examResult: [],
    message: [
      {
        id: "msg-1",
        senderId: "parent-id",
        receiverId: "teacher-id",
        schoolId: "school-id",
        content: "Hi Ms. Sara, I wanted to ask about Zainab's progress in Algebra.",
        isRead: false,
        readAt: null,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
    auditLog: [],
    aIAction: [],
    lessonPlan: [],
    leaveRequest: [],
  };
}

const store = globalForMock.store;

// ─── QUERY ENGINE HELPER ───────────────────────────────────────────────
function matchFilter(item: any, where: any): boolean {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === "name_section_schoolId" || key === "code_schoolId" || key === "classId_subjectId" || key === "rollNumber_classId" || key === "studentId_date_classId" || key === "assignmentId_studentId" || key === "examId_studentId") {
      if (value && typeof value === "object") {
        let isMatch = true;
        for (const [subKey, subVal] of Object.entries(value)) {
          if (item[subKey] !== subVal) {
            if (subVal instanceof Date && item[subKey] instanceof Date) {
              if (subVal.getTime() !== item[subKey].getTime()) {
                isMatch = false;
                break;
              }
            } else {
              isMatch = false;
              break;
            }
          }
        }
        if (!isMatch) return false;
        continue;
      }
    }
    if (value && typeof value === "object") {
      if ("contains" in value) {
        const itemVal = String(item[key] || "").toLowerCase();
        const searchVal = String((value as any).contains).toLowerCase();
        if (!itemVal.includes(searchVal)) return false;
      } else if ("in" in value) {
        const list = (value as any).in as any[];
        if (!list.includes(item[key])) return false;
      } else if (key === "student" || key === "createdBy" || key === "classTeacher" || key === "class" || key === "user" || key === "parents") {
        // Relation filter matching
        const relation = item[key];
        if (!relation) {
          if (key === "student" && item.studentId) {
            const stu = store.student.find(s => s.id === item.studentId);
            if (!stu || !matchFilter(stu, value)) return false;
          } else if (key === "class" && item.classId) {
            const cls = store.class.find(c => c.id === item.classId);
            if (!cls || !matchFilter(cls, value)) return false;
          } else if (key === "user" && item.userId) {
            const usr = store.user.find(u => u.id === item.userId);
            if (!usr || !matchFilter(usr, value)) return false;
          } else {
            return false;
          }
        } else if (Array.isArray(relation)) {
          if (!relation.some(r => matchFilter(r, value))) return false;
        } else {
          if (!matchFilter(relation, value)) return false;
        }
      } else {
        // Inequality filters (gte, lte, gt, lt)
        const itemVal = item[key];
        if ("gte" in value && itemVal < (value as any).gte) return false;
        if ("lte" in value && itemVal > (value as any).lte) return false;
        if ("gt" in value && itemVal <= (value as any).gt) return false;
        if ("lt" in value && itemVal >= (value as any).lt) return false;
      }
    } else {
      if (item[key] !== value) return false;
    }
  }
  return true;
}

// Intercepts findMany inclusions & selections
function resolveIncludes(modelName: string, item: any, includeOrSelect: any): any {
  if (!includeOrSelect || !item) return item;
  const copy = { ...item };
  for (const [key, value] of Object.entries(includeOrSelect)) {
    if (!value) continue;
    if (modelName === "user") {
      if (key === "teacher") {
        const teacher = store.teacher.find(t => t.userId === item.id);
        copy.teacher = teacher ? resolveIncludes("teacher", teacher, (value as any).include || (value as any).select) : null;
      }
      if (key === "parent") {
        const parent = store.parent.find(p => p.userId === item.id);
        copy.parent = parent ? resolveIncludes("parent", parent, (value as any).include || (value as any).select) : null;
      }
      if (key === "principalSchools") {
        const schools = store.school.filter(s => s.principalId === item.id);
        copy.principalSchools = schools.map(s => resolveIncludes("school", s, (value as any).include || (value as any).select));
      }
    }
    if (key === "user" && (modelName === "teacher" || modelName === "parent")) {
      copy.user = store.user.find(u => u.id === item.userId);
    }
    if (key === "school") {
      copy.school = store.school.find(s => s.id === item.schoolId || s.id === "school-id");
    }
    if (key === "classTeacher" && modelName === "class") {
      const teacher = store.teacher.find(t => t.id === item.classTeacherId || (t.isClassTeacher && t.managedClassId === item.id));
      copy.classTeacher = teacher ? resolveIncludes("teacher", teacher, (value as any).include || (value as any).select) : null;
    }
    if (key === "class" && (modelName === "student" || modelName === "teacher" || modelName === "fee")) {
      copy.class = store.class.find(c => c.id === item.classId);
    }
    if (key === "students" && modelName === "class") {
      const students = store.student.filter(s => s.classId === item.id);
      copy.students = students.map(s => resolveIncludes("student", s, (value as any).include || (value as any).select));
    }
    if (key === "classSubjects" && modelName === "class") {
      copy.classSubjects = store.classSubject.filter(cs => cs.classId === item.id);
    }
    if (key === "parents" && modelName === "student") {
      const parents = store.parent.filter(p => p.studentId === item.id || p.userId === "parent-id");
      copy.parents = parents.map(p => resolveIncludes("parent", p, (value as any).include || (value as any).select));
    }
    if (key === "createdBy" && modelName === "announcement") {
      copy.createdBy = store.user.find(u => u.id === item.createdById);
    }
    if (key === "student" && modelName === "fee") {
      const stu = store.student.find(s => s.id === item.studentId);
      copy.student = stu ? resolveIncludes("student", stu, (value as any).include || (value as any).select) : null;
    }
    if (key === "attendances" && (modelName === "student" || modelName === "teacher")) {
      const fieldId = modelName === "student" ? "studentId" : "teacherId";
      copy.attendances = store.attendance.filter(a => a[fieldId] === item.id);
    }
    if (key === "subject" && item.subjectId) {
      const subj = store.subject?.find(s => s.id === item.subjectId);
      copy.subject = subj ? resolveIncludes("subject", subj, (value as any).include || (value as any).select) : null;
    }
    if (key === "class" && item.classId) {
      const cls = store.class?.find(c => c.id === item.classId);
      copy.class = cls ? resolveIncludes("class", cls, (value as any).include || (value as any).select) : null;
    }
    if (key === "submissions" && modelName === "assignment") {
      const subs = store.submission?.filter(s => s.assignmentId === item.id) || [];
      copy.submissions = subs.map(s => resolveIncludes("submission", s, (value as any).include || (value as any).select));
    }
    if (key === "assignment" && modelName === "submission") {
      const assign = store.assignment?.find(a => a.id === item.assignmentId);
      copy.assignment = assign ? resolveIncludes("assignment", assign, (value as any).include || (value as any).select) : null;
    }
    if (key === "student" && item.studentId) {
      const stu = store.student?.find(s => s.id === item.studentId);
      copy.student = stu ? resolveIncludes("student", stu, (value as any).include || (value as any).select) : null;
    }
    if (key === "exam" && modelName === "examResult") {
      const ex = store.exam?.find(e => e.id === item.examId);
      copy.exam = ex ? resolveIncludes("exam", ex, (value as any).include || (value as any).select) : null;
    }
  }
  return copy;
}

import { sanitizeText, sanitizeHTML } from "./sanitize";

function sanitizePayload(data: any): any {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      if (
        key === "content" ||
        key === "description" ||
        key === "aiComment" ||
        key === "aiFeedback" ||
        key === "teacherFeedback" ||
        key === "note"
      ) {
        sanitized[key] = sanitizeHTML(value);
      } else {
        sanitized[key] = sanitizeText(value);
      }
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

if (globalForMock.useMock === undefined) {
  globalForMock.useMock = false;
}

// ─── GENERIC DELEGATE MOCK IMPLEMENTATION ─────────────────────────────
function createMockDelegate(modelName: string, originalDelegate: any) {
  return new Proxy(originalDelegate, {
    get(target, prop) {
      const propStr = String(prop);

      // Wrapper function to execute database call with self-healing fallback
      const runMethod = (fallbackFn: (args?: any) => any, originalMethodName: string) => {
        return async (...args: any[]) => {
          // Pre-sanitize payload data on all creations/updates
          if (["create", "createMany", "update", "updateMany", "upsert"].includes(originalMethodName)) {
            if (args[0] && args[0].data) {
              args[0].data = sanitizePayload(args[0].data);
            }
            if (args[0] && args[0].create) {
              args[0].create = sanitizePayload(args[0].create);
            }
            if (args[0] && args[0].update) {
              args[0].update = sanitizePayload(args[0].update);
            }
          }

          if (globalForMock.useMock) {
            return fallbackFn(args[0]);
          }
          try {
            const method = target[originalMethodName];
            return await method.apply(target, args);
          } catch (error) {
            const err = error as { message?: string; code?: string };
            const isConnErr =
              err.message?.includes("connection") ||
              err.message?.includes("connect") ||
              err.code === "ECONNREFUSED" ||
              err.code === "P1001" ||
              err.code === "P1002";

            if (isConnErr) {
              if (!globalForMock.useMock) {
                console.warn(`[PRISMA FALLBACK] Connection to PostgreSQL failed. Switching to self-healing in-memory database mock for model: "${modelName}".`);
                globalForMock.useMock = true;
              }
              return fallbackFn(args[0]);
            }
            throw error;
          }
        };
      };

      if (propStr === "findUnique" || propStr === "findFirst") {
        return runMethod((args?: any) => {
          const matched = store[modelName].find(item => matchFilter(item, args?.where));
          return matched ? resolveIncludes(modelName, matched, args?.include || args?.select) : null;
        }, propStr);
      }

      if (propStr === "findMany") {
        return runMethod((args?: any) => {
          let list = store[modelName].filter(item => matchFilter(item, args?.where));
          
          // Order by sorting (robust array/object support)
          if (args?.orderBy) {
            const orderByList = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
            list = [...list].sort((a, b) => {
              for (const orderObj of orderByList) {
                const sortKey = Object.keys(orderObj)[0];
                if (!sortKey) continue;
                const direction = orderObj[sortKey];
                const valA = a[sortKey];
                const valB = b[sortKey];
                if (valA === undefined || valB === undefined) continue;
                if (valA < valB) return direction === "asc" ? -1 : 1;
                if (valA > valB) return direction === "asc" ? 1 : -1;
              }
              return 0;
            });
          }

          // Pagination skips & takes
          if (args?.skip !== undefined) {
            list = list.slice(args.skip);
          }
          if (args?.take !== undefined) {
            list = list.slice(0, args.take);
          }

          return list.map(item => resolveIncludes(modelName, item, args?.include || args?.select));
        }, "findMany");
      }

      if (propStr === "count") {
        return runMethod((args?: any) => {
          return store[modelName].filter(item => matchFilter(item, args?.where)).length;
        }, "count");
      }

      if (propStr === "create") {
        return runMethod((args?: any) => {
          const id = `${modelName}-${Math.random().toString(36).substr(2, 9)}`;
          const newItem = {
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args?.data,
          };
          
          // Custom check for double links
          if (modelName === "user" && newItem.role === "PRINCIPAL") {
            newItem.principalSchools = [{ id: "school-id" }];
          }

          store[modelName].push(newItem);
          return resolveIncludes(modelName, newItem, args?.include || args?.select);
        }, "create");
      }

      if (propStr === "createMany") {
        return runMethod((args?: any) => {
          const dataArray = Array.isArray(args?.data) ? args.data : [args?.data];
          dataArray.forEach((d: any) => {
            const id = `${modelName}-${Math.random().toString(36).substr(2, 9)}`;
            store[modelName].push({
              id,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...d,
            });
          });
          return { count: dataArray.length };
        }, "createMany");
      }

      if (propStr === "update") {
        return runMethod((args?: any) => {
          const index = store[modelName].findIndex(item => matchFilter(item, args?.where));
          if (index === -1) {
            throw new Error(`Record to update not found in mock store for model ${modelName}`);
          }
          store[modelName][index] = {
            ...store[modelName][index],
            ...args?.data,
            updatedAt: new Date(),
          };
          return resolveIncludes(modelName, store[modelName][index], args?.include || args?.select);
        }, "update");
      }

      if (propStr === "delete") {
        return runMethod((args?: any) => {
          const index = store[modelName].findIndex(item => matchFilter(item, args?.where));
          if (index === -1) {
            throw new Error(`Record to delete not found in mock store for model ${modelName}`);
          }
          const deleted = store[modelName][index];
          store[modelName].splice(index, 1);
          return deleted;
        }, "delete");
      }

      if (propStr === "deleteMany") {
        return runMethod((args?: any) => {
          const originalLength = store[modelName].length;
          store[modelName] = store[modelName].filter(item => !matchFilter(item, args?.where));
          return { count: originalLength - store[modelName].length };
        }, "deleteMany");
      }

      if (propStr === "updateMany") {
        return runMethod((args?: any) => {
          let count = 0;
          store[modelName].forEach((item, idx) => {
            if (matchFilter(item, args?.where)) {
              store[modelName][idx] = {
                ...item,
                ...args?.data,
                updatedAt: new Date(),
              };
              count++;
            }
          });
          return { count };
        }, "updateMany");
      }

      if (propStr === "upsert") {
        return runMethod((args?: any) => {
          const index = store[modelName].findIndex(item => matchFilter(item, args?.where));
          if (index !== -1) {
            store[modelName][index] = {
              ...store[modelName][index],
              ...args?.update,
              updatedAt: new Date(),
            };
            return resolveIncludes(modelName, store[modelName][index], args?.include || args?.select);
          } else {
            const id = `${modelName}-${Math.random().toString(36).substr(2, 9)}`;
            const newItem = {
              id,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...args?.create,
            };
            store[modelName].push(newItem);
            return resolveIncludes(modelName, newItem, args?.include || args?.select);
          }
        }, "upsert");
      }

      if (propStr === "groupBy") {
        return runMethod((args?: any) => {
          const list = store[modelName].filter(item => matchFilter(item, args?.where));
          // Grouping logic by status
          const groups: Record<string, { status: string; _sum: { amount: number; paidAmount: number }; _count: number }> = {};
          list.forEach(item => {
            const val = item.status || "PENDING";
            if (!groups[val]) {
              groups[val] = {
                status: val,
                _sum: { amount: 0, paidAmount: 0 },
                _count: 0
              };
            }
            groups[val]._sum.amount += (item.amount || 0);
            groups[val]._sum.paidAmount += (item.paidAmount || 0);
            groups[val]._count++;
          });
          return Object.values(groups);
        }, "groupBy");
      }

      if (propStr === "aggregate") {
        return runMethod((args?: any) => {
          const list = store[modelName].filter(item => matchFilter(item, args?.where));
          const sumAmount = list.reduce((sum, item) => sum + (item.amount || 0), 0);
          const sumPaid = list.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
          return {
            _sum: {
              amount: sumAmount,
              paidAmount: sumPaid,
            },
          };
        }, "aggregate");
      }

      return Reflect.get(target, prop);
    },
  });
}

// ─── CLIENT PROXY WRAPPER ──────────────────────────────────────────────
export const db = new Proxy(prismaClient, {
  get(target, prop, receiver) {
    const propStr = String(prop);

    // Trap db.$transaction
    if (propStr === "$transaction") {
      return async (arg: any) => {
        if (globalForMock.useMock) {
          if (typeof arg === "function") {
            return await arg(db);
          }
          return await Promise.all(arg);
        }
        try {
          return await target.$transaction(arg);
        } catch (error) {
          const err = error as { message?: string; code?: string };
          const isConnErr =
            err.message?.includes("connection") ||
            err.message?.includes("connect") ||
            err.code === "ECONNREFUSED" ||
            err.code === "P1001" ||
            err.code === "P1002";

          if (isConnErr) {
            globalForMock.useMock = true;
            console.warn("[PRISMA FALLBACK] Connection to PostgreSQL failed during transaction. Falling back to mock transaction.");
            if (typeof arg === "function") {
              return await arg(db);
            }
            return await Promise.all(arg);
          }
          throw error;
        }
      };
    }

    if (propStr in store) {
      const originalDelegate = Reflect.get(target, prop, receiver);
      return createMockDelegate(propStr, originalDelegate);
    }

    return Reflect.get(target, prop, receiver);
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
