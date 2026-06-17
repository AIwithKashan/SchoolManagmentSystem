import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { studentId } = params;

    // Verify parent has access to this student
    const parent = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parent) {
      return errorResponse("You do not have permission", 403);
    }

    // Resolve student classId
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student?.classId) {
      return errorResponse("Record not found", 404);
    }

    // Fetch the actual subjects and teachers assigned to this class
    const classSubjects = await db.classSubject.findMany({
      where: { classId: student.classId },
      include: {
        subject: { select: { name: true } },
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    // Mock materials templates by subject category
    const materialTemplates = [
      {
        title: "Lecture Notes: Introduction and Overview",
        fileName: "lecture_notes_ch1.pdf",
        fileSize: "2.4 MB",
        type: "Syllabus Notes",
      },
      {
        title: "Chapter 2 Practice Workbook & Exercises",
        fileName: "workbook_ch2.pdf",
        fileSize: "8.1 MB",
        type: "Practice Workbook",
      },
      {
        title: "Formula Sheets & Revision Key Topics",
        fileName: "revision_cheatsheet.pdf",
        fileSize: "1.5 MB",
        type: "Revision Aid",
      },
      {
        title: "Term Exam Study Guide and Model Papers",
        fileName: "study_guide_model_papers.docx",
        fileSize: "4.7 MB",
        type: "Exam Guide",
      },
    ];

    // Combine actual database subjects/teachers with mock materials templates
    const materials: any[] = [];
    let counter = 1;

    classSubjects.forEach((cs) => {
      const subjectName = cs.subject.name;
      const teacherName = cs.teacher?.user?.name || "Subject Instructor";

      // Distribute material templates for this subject
      materialTemplates.forEach((template, idx) => {
        // Stagger upload dates a bit
        const uploadDate = new Date();
        uploadDate.setDate(uploadDate.getDate() - (idx * 3 + 2));

        materials.push({
          id: `mat-${cs.id}-${idx}`,
          title: `${subjectName} — ${template.title}`,
          subjectName: subjectName,
          teacherName: teacherName,
          fileName: `${subjectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${template.fileName}`,
          fileSize: template.fileSize,
          type: template.type,
          uploadDate: uploadDate.toISOString(),
          downloadUrl: `https://example.com/downloads/${cs.id}_${idx}.pdf`, // Mock download URL
        });
      });
    });

    // Fallback if no subjects found in class (provide general materials)
    if (materials.length === 0) {
      const defaultSubjects = ["General Science", "English Lit", "Social Studies"];
      defaultSubjects.forEach((subName, sIdx) => {
        materialTemplates.forEach((template, idx) => {
          const uploadDate = new Date();
          uploadDate.setDate(uploadDate.getDate() - (idx * 5));

          materials.push({
            id: `mat-def-${sIdx}-${idx}`,
            title: `${subName} — ${template.title}`,
            subjectName: subName,
            teacherName: "Class Instructor",
            fileName: `${subName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${template.fileName}`,
            fileSize: template.fileSize,
            type: template.type,
            uploadDate: uploadDate.toISOString(),
            downloadUrl: `https://example.com/downloads/def_${sIdx}_${idx}.pdf`,
          });
        });
      });
    }

    return NextResponse.json(materials);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_MATERIALS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
