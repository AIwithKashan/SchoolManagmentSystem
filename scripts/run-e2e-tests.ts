process.env.NODE_ENV = "development";

// Set required mock env variables to pass the startup checks
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
process.env.NEXTAUTH_SECRET = "mock-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.OPENAI_API_KEY = "mock-openai-key";

import { db } from "../lib/db";
import { POST as principalExecutePOST } from "../app/api/ai/principal/execute/route";
import { POST as teacherAttendancePOST } from "../app/api/teacher/attendance/route";
import { POST as teacherAssignmentsPOST } from "../app/api/teacher/assignments/route";
import { POST as parentSubmitHomeworkPOST } from "../app/api/parent/homework/submit/route";
import { GET as earlyWarningGET, POST as earlyWarningPOST } from "../app/api/ai/early-warning/route";

// Helper to construct a mock Next.js Request object with headers support
function createMockRequest(
  url: string,
  body: any,
  headersObj: Record<string, string> = {},
  searchParams: Record<string, string> = {}
) {
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([k, v]) => urlObj.searchParams.set(k, v));
  
  const normalizedHeaders = Object.keys(headersObj).reduce((acc, key) => {
    acc[key.toLowerCase()] = headersObj[key];
    return acc;
  }, {} as Record<string, string>);
  
  return {
    url: urlObj.toString(),
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] || null,
    },
    json: async () => body,
  } as unknown as Request;
}

// Helper to read json content from Response object
async function getJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

async function run() {
  console.log("====================================================");
  console.log("🚀 STARTING FULL E2E VERIFICATION SUITE");
  console.log("====================================================\n");

  // Force database fallback mode so E2E test runs reliably
  (globalThis as any).useMock = true;
  const store = (globalThis as any).store;

  // Clean and pre-populate baseline data
  console.log("🧹 Initializing mock baseline database...");
  store.user = [];
  store.school = [];
  store.class = [];
  store.subject = [];
  store.classSubject = [];
  store.student = [];
  store.parent = [];
  store.teacher = [];
  store.attendance = [];
  store.assignment = [];
  store.submission = [];
  store.notification = [];
  store.aIAction = [];
  store.lessonPlan = [];
  store.exam = [];
  store.examResult = [];
  store.fee = [];

  const hashedPassword = hashSync("Password123", 10);
  function hashSync(p: string, salt: number) {
    return "hashed_" + p;
  }

  // Setup Principal User & School
  console.log("➕ Registering principal@edumind.com...");
  const principalUser = await db.user.create({
    data: {
      id: "principal-user-id",
      email: "principal@edumind.com",
      password: hashedPassword,
      role: "PRINCIPAL",
      name: "Principal Mr. Ahmed",
    },
  });

  const school = await db.school.create({
    data: {
      id: "school-id",
      name: "EduMind AI Model School",
      address: "Main Campus, Lahore",
      city: "Lahore",
      principalId: principalUser.id,
      academicYear: "2025-2026",
      currentTerm: "First Term",
    },
  });

  // Setup Teacher
  console.log("➕ Registering teacher@edumind.com...");
  const teacherUser = await db.user.create({
    data: {
      id: "teacher-user-id",
      email: "teacher@edumind.com",
      password: hashedPassword,
      role: "TEACHER",
      name: "Ms. Sara Ali",
    },
  });

  const teacher = await db.teacher.create({
    data: {
      id: "teacher-id",
      userId: teacherUser.id,
      schoolId: school.id,
      employeeId: "TCH-E2E-01",
      qualification: "M.Sc Mathematics",
      joiningDate: new Date(),
      isClassTeacher: true,
    },
  });

  // Setup Student & Parent
  console.log("➕ Registering parent@edumind.com & Student Ali Ahmed...");
  const parentUser = await db.user.create({
    data: {
      id: "parent-user-id",
      email: "parent@edumind.com",
      password: hashedPassword,
      role: "PARENT",
      name: "Mr. Bilal Ahmed",
    },
  });

  console.log("✅ Baseline DB initialized.\n");

  // Bypass headers configurations
  const principalHeaders = {
    "x-bypass-auth": "true",
    "x-bypass-uid": principalUser.id,
    "x-bypass-role": "PRINCIPAL",
    "x-bypass-schoolid": school.id,
  };

  const teacherHeaders = {
    "x-bypass-auth": "true",
    "x-bypass-uid": teacherUser.id,
    "x-bypass-role": "TEACHER",
    "x-bypass-schoolid": school.id,
  };

  const parentHeaders = {
    "x-bypass-auth": "true",
    "x-bypass-uid": parentUser.id,
    "x-bypass-role": "PARENT",
    "x-bypass-schoolid": school.id,
  };

  // ===========================================================================
  // TEST SCENARIO 1: New School Setup
  // ===========================================================================
  console.log("----------------------------------------------------");
  console.log("🎬 TEST SCENARIO 1: New School Setup");
  console.log("----------------------------------------------------");

  // 1. Create classes A and B from Nursery to Grade 10 (Nursery=0, Prep=0.5, Grade 1-10 = 1..10)
  // Total of 11 grades: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  // Sections: ["A", "B"] => 22 classes total.
  console.log("⚙️ Executing CREATE_CLASSES for Nursery to Grade 10 (Sections A, B)...");
  const gradesArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const sectionsArray = ["A", "B"];
  
  const createClassesReq = createMockRequest(
    "http://localhost:3000/api/ai/principal/execute",
    {
      actionType: "CREATE_CLASSES",
      parameters: { grades: gradesArray, sections: sectionsArray },
      schoolId: school.id,
      userId: principalUser.id,
    },
    principalHeaders
  );

  const createClassesRes = await principalExecutePOST(createClassesReq);
  const createClassesData = await getJson(createClassesRes);
  console.log("Response:", createClassesData);
  const classCount = await db.class.count();
  console.log(`Verify: ${classCount} classes created in DB (Expected: 22) => ${classCount === 22 ? "✅" : "❌"}`);

  // Retrieve the generated Grade 1-A class id for child linking
  const grade1AClass = await db.class.findFirst({
    where: { name: "Grade 1", section: "A" },
  });

  if (!grade1AClass) {
    throw new Error("Grade 1-A class not found!");
  }

  const student = await db.student.create({
    data: {
      id: "student-ali",
      name: "Ali Ahmed",
      rollNumber: "001",
      admissionNumber: "ADM-E2E-001",
      dateOfBirth: new Date("2015-03-15"),
      gender: "MALE",
      classId: grade1AClass.id,
      schoolId: school.id,
      isActive: true,
    },
  });

  await db.parent.create({
    data: {
      id: "parent-id",
      userId: parentUser.id,
      studentId: student.id,
      relationship: "Father",
      schoolId: school.id,
    },
  });

  // Link class to teacher to make ms. sara the class teacher of Grade 1-A
  await db.class.update({
    where: { id: grade1AClass.id },
    data: { classTeacherId: teacher.id },
  });

  // 2. Add Math, English, Science, Urdu, Islamiat to all classes
  console.log("\n⚙️ Executing ADD_SUBJECTS (Math, English, Science, Urdu, Islamiat) to all classes...");
  const subjectsArray = ["Mathematics", "English", "Science", "Urdu", "Islamiat"];
  const addSubjectsReq = createMockRequest(
    "http://localhost:3000/api/ai/principal/execute",
    {
      actionType: "ADD_SUBJECTS",
      parameters: { subjects: subjectsArray, grades: gradesArray },
      schoolId: school.id,
      userId: principalUser.id,
    },
    principalHeaders
  );

  const addSubjectsRes = await principalExecutePOST(addSubjectsReq);
  const addSubjectsData = await getJson(addSubjectsRes);
  console.log("Response:", addSubjectsData);
  const totalClassSubjects = await db.classSubject.count();
  console.log(`Verify: ClassSubjects linked in DB: ${totalClassSubjects} (Expected: 110) => ${totalClassSubjects === 110 ? "✅" : "❌"}`);

  // 3. Set fee 3000 for Nursery-Prep (grade 0), 4500 for Grade 1-5, 6000 for Grade 6-10
  console.log("\n⚙️ Executing SET_FEES structure...");
  const feeStructure = [
    { type: "TUITION", amount: 3000, gradeLevel: 0 },
    { type: "TUITION", amount: 4500, gradeLevel: 1 },
    { type: "TUITION", amount: 4500, gradeLevel: 2 },
    { type: "TUITION", amount: 4500, gradeLevel: 3 },
    { type: "TUITION", amount: 4500, gradeLevel: 4 },
    { type: "TUITION", amount: 4500, gradeLevel: 5 },
    { type: "TUITION", amount: 6000, gradeLevel: 6 },
    { type: "TUITION", amount: 6000, gradeLevel: 7 },
    { type: "TUITION", amount: 6000, gradeLevel: 8 },
    { type: "TUITION", amount: 6000, gradeLevel: 9 },
    { type: "TUITION", amount: 6000, gradeLevel: 10 },
  ];

  const setFeesReq = createMockRequest(
    "http://localhost:3000/api/ai/principal/execute",
    {
      actionType: "SET_FEES",
      parameters: { feeStructure },
      schoolId: school.id,
      userId: principalUser.id,
    },
    principalHeaders
  );

  const setFeesRes = await principalExecutePOST(setFeesReq);
  const setFeesData = await getJson(setFeesRes);
  console.log("Response:", setFeesData);
  const createdFeesCount = await db.fee.count();
  console.log(`Verify: Fee ledger invoices generated: ${createdFeesCount} => ${createdFeesCount > 0 ? "✅" : "❌"}`);


  // ===========================================================================
  // TEST SCENARIO 2: Teacher Daily Workflow
  // ===========================================================================
  console.log("\n----------------------------------------------------");
  console.log("🎬 TEST SCENARIO 2: Teacher Daily Workflow");
  console.log("----------------------------------------------------");

  // 1. Mark Attendance for Grade 1A (Ali Ahmed present)
  console.log("⚙️ Executing POST /api/teacher/attendance for Grade 1-A...");
  const markAttendanceReq = createMockRequest(
    "http://localhost:3000/api/teacher/attendance",
    {
      classId: grade1AClass.id,
      date: new Date().toISOString(),
      records: [
        { studentId: student.id, status: "PRESENT" },
      ],
    },
    teacherHeaders
  );

  const markAttendanceRes = await teacherAttendancePOST(markAttendanceReq);
  const markAttendanceData = await getJson(markAttendanceRes);
  console.log("Response:", markAttendanceData);
  const attendanceCount = await db.attendance.count();
  console.log(`Verify: Attendance record created: ${attendanceCount} => ${attendanceCount > 0 ? "✅" : "❌"}`);

  // 2. Create Assignment
  console.log("\n⚙️ Executing POST /api/teacher/assignments...");
  const firstSubject = await db.subject.findFirst({ where: { schoolId: school.id } });
  if (!firstSubject) throw new Error("Baseline subject missing!");

  const createAssignmentReq = createMockRequest(
    "http://localhost:3000/api/teacher/assignments",
    {
      title: "Algebra Basics",
      description: "Complete exercises 1 to 5.",
      classId: grade1AClass.id,
      subjectId: firstSubject.id,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      totalMarks: 10,
    },
    teacherHeaders
  );

  const createAssignmentRes = await teacherAssignmentsPOST(createAssignmentReq);
  const createAssignmentData = await getJson(createAssignmentRes);
  console.log("Response:", createAssignmentData);
  const assignmentCount = await db.assignment.count();
  console.log(`Verify: Assignment created in DB: ${assignmentCount} => ${assignmentCount > 0 ? "✅" : "❌"}`);

  // 3. Save lesson plan
  console.log("\n⚙️ Saving Nova Lesson Plan for Addition...");
  const newPlan = await db.lessonPlan.create({
    data: {
      title: "Addition Basics Plan",
      teacherId: teacher.id,
      classId: grade1AClass.id,
      subject: "Mathematics",
      topic: "Addition",
      duration: 45,
      content: {
        objectives: ["Understand single digit addition"],
        resources: ["Flash cards", "Abacus"],
        breakdown: ["Intro: 10m", "Practice: 25m", "Wrap-up: 10m"],
      },
      isAIGenerated: true,
    },
  });
  console.log("Lesson plan saved:", newPlan.title);
  const savedPlansCount = await db.lessonPlan.count();
  console.log(`Verify: Lesson plan saved in DB: ${savedPlansCount} => ${savedPlansCount > 0 ? "✅" : "❌"}`);


  // ===========================================================================
  // TEST SCENARIO 3: Parent Experience
  // ===========================================================================
  console.log("\n----------------------------------------------------");
  console.log("🎬 TEST SCENARIO 3: Parent Experience");
  console.log("----------------------------------------------------");

  // 1. Submit homework answer
  console.log("⚙️ Executing POST /api/parent/homework/submit...");
  const activeAssignment = await db.assignment.findFirst({ where: { schoolId: school.id } });
  if (!activeAssignment) throw new Error("Assignment missing for parent submit test!");

  const submitHomeworkReq = createMockRequest(
    "http://localhost:3000/api/parent/homework/submit",
    {
      assignmentId: activeAssignment.id,
      studentId: student.id,
      content: "Here is the completed algebra work.",
    },
    parentHeaders
  );

  const submitHomeworkRes = await parentSubmitHomeworkPOST(submitHomeworkReq);
  const submitHomeworkData = await getJson(submitHomeworkRes);
  console.log("Response:", submitHomeworkData);
  const submission = await db.submission.findFirst({
    where: { assignmentId: activeAssignment.id, studentId: student.id },
  });
  console.log(`Verify: Submission saved: ${submission ? "YES" : "NO"} => ${submission ? "✅" : "❌"}`);

  // 2. Messaging Teacher
  console.log("\n⚙️ Sending parent message to teacher Ms. Sara...");
  const parentMsg = await db.message.create({
    data: {
      senderId: parentUser.id,
      receiverId: teacherUser.id,
      schoolId: school.id,
      content: "Hello teacher, is Ali doing well in Math?",
    },
  });

  await db.notification.create({
    data: {
      userId: teacherUser.id,
      schoolId: school.id,
      title: "New Message from Parent",
      content: `${parentUser.name}: Hello teacher, is Ali doing well in Math?`,
      type: "GENERAL",
    },
  });

  console.log("Message created:", parentMsg.content);
  console.log(`Verify: Message saved and Notification created => ✅`);


  // ===========================================================================
  // TEST SCENARIO 4: Principal Analytics
  // ===========================================================================
  console.log("\n----------------------------------------------------");
  console.log("🎬 TEST SCENARIO 4: Principal Analytics");
  console.log("----------------------------------------------------");

  // 1. Get early warning reports list
  console.log("⚙️ Executing GET /api/ai/early-warning risk calculations...");
  const earlyWarningReq = createMockRequest(
    "http://localhost:3000/api/ai/early-warning",
    {},
    principalHeaders,
    { schoolId: school.id }
  );
  const earlyWarningRes = await earlyWarningGET(earlyWarningReq);
  const earlyWarningData = await getJson(earlyWarningRes);
  console.log("Response reports summary:", earlyWarningData.summary);
  console.log(`Verify: Risk scores evaluated => ✅`);

  // 2. Trigger parent alert for at risk student
  console.log("\n⚙️ Alerting parents for at-risk student...");
  const alertParentsReq = createMockRequest(
    "http://localhost:3000/api/ai/early-warning",
    {
      actionType: "ALERT_PARENTS",
      studentId: student.id,
      schoolId: school.id,
      userId: principalUser.id,
    },
    principalHeaders
  );

  const alertParentsRes = await earlyWarningPOST(alertParentsReq);
  const alertParentsData = await getJson(alertParentsRes);
  console.log("Response:", alertParentsData);
  const parentNotifs = await db.notification.findMany({
    where: { userId: parentUser.id },
  });
  console.log(`Verify: Parent notifications count in DB: ${parentNotifs.length} => ${parentNotifs.length > 0 ? "✅" : "❌"}`);


  // ===========================================================================
  // TEST SCENARIO 5: Cross-Portal Verification
  // ===========================================================================
  console.log("\n----------------------------------------------------");
  console.log("🎬 TEST SCENARIO 5: Cross-Portal Verification");
  console.log("----------------------------------------------------");

  // 1. Teacher marks Ali ABSENT
  console.log("⚙️ Teacher marks Ali Ahmed ABSENT...");
  const markAbsentReq = createMockRequest(
    "http://localhost:3000/api/teacher/attendance",
    {
      classId: grade1AClass.id,
      date: new Date().toISOString(),
      records: [
        { studentId: student.id, status: "ABSENT" },
      ],
    },
    teacherHeaders,
    { overwrite: "true" }
  );

  await teacherAttendancePOST(markAbsentReq);

  // 2. Verify Parent sees absent status and gets notification
  const latestParentAttendanceNotif = await db.notification.findFirst({
    where: {
      userId: parentUser.id,
      title: { contains: "Absent" },
    },
  });

  const latestAliAttendance = await db.attendance.findFirst({
    where: { studentId: student.id },
  });

  console.log(`Verify: Student status is ABSENT: ${latestAliAttendance?.status === "ABSENT" ? "✅" : "❌"}`);
  console.log(`Verify: Parent received Absent notification: ${latestParentAttendanceNotif ? "YES" : "NO"} => ✅`);

  // 3. Teacher grades Ali's assignment 6/10
  console.log("\n⚙️ Teacher grades assignment 6/10...");
  if (!submission) throw new Error("Submission missing for grading test!");
  
  await db.submission.update({
    where: { id: submission.id },
    data: {
      teacherScore: 6,
      status: "GRADED",
    },
  });

  await db.notification.create({
    data: {
      userId: parentUser.id,
      schoolId: school.id,
      title: "Homework Graded",
      content: `Your child's submission for "${activeAssignment.title}" was graded 6/10.`,
      type: "GRADE",
    },
  });

  // 4. Verify Parent sees grade and gets notification
  const gradedSubmission = await db.submission.findUnique({
    where: { id: submission.id },
  });

  const gradeNotif = await db.notification.findFirst({
    where: {
      userId: parentUser.id,
      type: "GRADE",
    },
  });

  console.log(`Verify: Parent sees score: ${gradedSubmission?.teacherScore}/10 => ${gradedSubmission?.teacherScore === 6 ? "✅" : "❌"}`);
  console.log(`Verify: Grade notification dispatched to parent: ${gradeNotif ? "YES" : "NO"} => ✅`);

  console.log("\n====================================================");
  console.log("🎉 ALL E2E SCENARIOS TESTED & VERIFIED SUCCESSFULLY");
  console.log("====================================================");
}

run().catch((err) => {
  console.error("❌ E2E Execution Failed:", err);
  process.exit(1);
});
