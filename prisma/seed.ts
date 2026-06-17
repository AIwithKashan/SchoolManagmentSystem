import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";
import "dotenv/config";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required for seeding.");
}

const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");
  const hash = (pass: string) => hashSync(pass, 10);

  // Clear existing data to allow re-runs
  console.log("Cleaning up database...");
  await prisma.announcement.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();

  // STEP 2 - Create Principal User
  console.log("Creating Principal User...");
  const principal = await prisma.user.create({
    data: {
      email: "principal@edumind.com",
      password: hash("Principal123"),
      role: "PRINCIPAL",
      name: "Mr. Ahmed Khan",
      phone: "0300-1234567",
    },
  });

  // STEP 1 - Create School
  console.log("Creating School...");
  const school = await prisma.school.create({
    data: {
      name: "Al-Noor School",
      address: "123 Education Street, Gulberg",
      city: "Lahore",
      phone: "042-35761234",
      email: "info@alnoor.edu.pk",
      academicYear: "2025-2026",
      currentTerm: "First Term",
      principalId: principal.id,
    },
  });

  // STEP 3 - Create Teacher User + Teacher Profile
  console.log("Creating Teacher User & Profile...");
  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@edumind.com",
      password: hash("Teacher123"),
      role: "TEACHER",
      name: "Ms. Sara Ali",
      phone: "0301-2345678",
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      schoolId: school.id,
      employeeId: "TCH-001",
      qualification: "M.Ed",
      specialization: "Mathematics",
      joiningDate: new Date("2023-01-15"),
      salary: 45000,
      isClassTeacher: false,
    },
  });

  // STEP 4 - Create Classes
  console.log("Creating Classes...");
  const classData = [
    { name: "Nursery", section: "A", gradeLevel: 0 },
    { name: "Nursery", section: "B", gradeLevel: 0 },
    { name: "Grade 1", section: "A", gradeLevel: 1 },
    { name: "Grade 1", section: "B", gradeLevel: 1 },
    { name: "Grade 5", section: "A", gradeLevel: 5 },
    { name: "Grade 10", section: "A", gradeLevel: 10 },
  ];

  const createdClasses: Record<string, any> = {};

  for (const c of classData) {
    const created = await prisma.class.create({
      data: {
        name: c.name,
        section: c.section,
        gradeLevel: c.gradeLevel,
        schoolId: school.id,
      },
    });
    createdClasses[`${c.name} ${c.section}`] = created;
  }

  // STEP 5 - Create Subjects
  console.log("Creating Subjects...");
  const subjectData = [
    { name: "Mathematics", code: "MATH-01", isCompulsory: true, gradeLevel: 1 },
    { name: "English", code: "ENG-01", isCompulsory: true, gradeLevel: 1 },
    { name: "Science", code: "SCI-01", isCompulsory: true, gradeLevel: 1 },
    { name: "Urdu", code: "URD-01", isCompulsory: true, gradeLevel: 1 },
    { name: "Islamiat", code: "ISL-01", isCompulsory: true, gradeLevel: 1 },
  ];

  for (const s of subjectData) {
    await prisma.subject.create({
      data: {
        name: s.name,
        code: s.code,
        gradeLevel: s.gradeLevel,
        schoolId: school.id,
        isCompulsory: s.isCompulsory,
      },
    });
  }

  // STEP 6 - Create Parent User + Student + Parent Profile
  console.log("Creating Parent, Student & Profile...");
  const parentUser = await prisma.user.create({
    data: {
      email: "parent@edumind.com",
      password: hash("Parent123"),
      role: "PARENT",
      name: "Mr. Bilal Ahmed",
      phone: "0302-3456789",
    },
  });

  const grade1AClass = createdClasses["Grade 1 A"];

  const student = await prisma.student.create({
    data: {
      name: "Ali Ahmed",
      rollNumber: "001",
      admissionNumber: "ADM-2025-001",
      dateOfBirth: new Date("2015-03-15"),
      gender: "MALE",
      classId: grade1AClass.id,
      schoolId: school.id,
      admissionDate: new Date("2025-04-01"),
    },
  });

  await prisma.parent.create({
    data: {
      userId: parentUser.id,
      studentId: student.id,
      relationship: "Father",
      occupation: "Engineer",
      cnic: "35202-1234567-1",
      schoolId: school.id,
    },
  });

  // STEP 7 - Create sample Announcement
  console.log("Creating Announcement...");
  await prisma.announcement.create({
    data: {
      title: "Welcome to EduMind AI!",
      content:
        "Welcome to our new AI-powered school management system. We are excited to bring you this modern platform.",
      targetRole: "ALL",
      schoolId: school.id,
      createdById: principal.id,
      isActive: true,
    },
  });

  // Report counts
  const userCount = await prisma.user.count();
  const schoolCount = await prisma.school.count();
  const classCount = await prisma.class.count();
  const studentCount = await prisma.student.count();

  console.log("\nSeeding finished successfully! 🎉");
  console.log(`- Users created: ${userCount}`);
  console.log(`- Schools created: ${schoolCount}`);
  console.log(`- Classes created: ${classCount}`);
  console.log(`- Students created: ${studentCount}`);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
