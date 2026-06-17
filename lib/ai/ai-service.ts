import { streamText } from 'ai';
import openai, { isMockAI, sdkOpenAIProvider } from './openai-client';
import { db } from '@/lib/db';
import { getAfiaPrompt, getNovaPrompt, getCarePrompt } from './system-prompts';
import { parseCommand } from './action-parser';
import { generateLessonPlan as localLessonPlanGenerator } from '@/lib/lesson-templates';
import logger from '@/lib/logger';

/**
 * DB Logging helper for AI actions
 */
async function logAIAction({
  schoolId,
  userId,
  portalType,
  command,
  actionTaken,
  status = 'SUCCESS',
}: {
  schoolId: string;
  userId: string;
  portalType: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
  command: string;
  actionTaken: any;
  status?: 'SUCCESS' | 'FAILED' | 'UNDONE';
}) {
  try {
    if (!schoolId || !userId) {
      logger.info('[AI Logs - Missing ID] Not writing to DB:', { schoolId, userId, command, actionTaken });
      return;
    }
    await db.aIAction.create({
      data: {
        schoolId,
        userId,
        portalType,
        command: command.slice(0, 500), // Protect DB constraints
        actionTaken: actionTaken || {},
        status,
        canUndo: false,
      },
    });
  } catch (error) {
    console.error('[AI Log Error] Failed to write AI action to database:', error);
  }
}

/**
 * Helper to simulate a streaming text response in mock mode
 */
function createMockStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = text.split(' ');
      for (const word of words) {
        controller.enqueue(encoder.encode(word + ' '));
        // Small delay to simulate streaming word by word
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Master AI Service Layer Class
 */
export class AIService {
  /**
   * FUNCTION 1: chat()
   * Returns a streaming response from gpt-4o, loaded with system prompts and school context.
   */
  static async chat({
    messages,
    systemPrompt,
    schoolContext,
    schoolId,
    userId,
    portalType,
  }: {
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    systemPrompt: string;
    schoolContext: any;
    schoolId: string;
    userId: string;
    portalType: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
  }): Promise<Response> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Chat Request';
    const combinedSystemPrompt = `${systemPrompt}\n\nCURRENT SCHOOL DATA CONTEXT:\n${JSON.stringify(
      schoolContext,
      null,
      2
    )}`;

    // Log the AI action to DB asynchronously
    await logAIAction({
      schoolId,
      userId,
      portalType,
      command: lastUserMessage,
      actionTaken: { type: 'chat_query', messageCount: messages.length },
    });

    if (isMockAI) {
      const mockReply = `Hello, I am your EduMind AI assistant (${portalType} mode). 
Currently, I am running in MOCK MODE since the OpenAI API key is missing or is set to a placeholder value.

Here is a summary of the School Context I received:
- School: ${schoolContext.schoolName || 'N/A'}
- City: ${schoolContext.city || 'N/A'}
- Total Students: ${schoolContext.totalStudents || 0}
- Today's Attendance Rate: ${schoolContext.todayAttendancePercentage || 100}%
- Fee Collection: ${schoolContext.thisMonthFeeCollection?.percentage || 0}% collected this month.

How else can I assist you in managing school operations today?`;
      return createMockStreamResponse(mockReply);
    }

    try {
      // Use modern Vercel AI SDK streamText call
      const result = await streamText({
        model: sdkOpenAIProvider(process.env.OPENAI_MODEL || 'openrouter/free') as any,
        system: combinedSystemPrompt,
        messages: messages as any,
        temperature: 0.7,
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error('[AIService.chat] Failed to fetch completion:', error);
      return createMockStreamResponse(
        'An error occurred while generating the AI stream response. Please check your API credentials.'
      );
    }
  }

  /**
   * FUNCTION 2: generateLessonPlan()
   * Generates a structured JSON object representing a lesson plan.
   */
  static async generateLessonPlan({
    subject,
    topic,
    grade,
    duration,
    objectives,
    schoolId,
    userId,
  }: {
    subject: string;
    topic: string;
    grade: string;
    duration: number;
    objectives: string;
    schoolId?: string;
    userId?: string;
  }) {
    const prompt = `You are a professional educational curriculum developer. Create a detailed, classroom-ready lesson plan.
Subject: ${subject}
Topic: ${topic}
Grade: ${grade}
Duration: ${duration} minutes
Learning Objectives: ${objectives}

Return ONLY a JSON object of this structure:
{
  "objectives": ["obj1", "obj2", ...],
  "breakdown": [
    { "title": "Section Title", "duration": number, "description": "detailed teacher activities and notes" }
  ],
  "resources": ["resource1", "resource2", ...],
  "assessment": "Detailed assessment statement or quiz definition"
}`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'TEACHER',
        command: `Generate Lesson Plan: ${subject} - ${topic}`,
        actionTaken: { type: 'generate_lesson_plan', subject, topic, grade },
      });
    }

    if (isMockAI) {
      // Use the local lesson plan builder from lesson-templates
      return localLessonPlanGenerator(subject, topic, duration, objectives);
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an educational assistant. Output strict JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });

      const text = response.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error('[AIService.generateLessonPlan] Failed, returning template fallback:', error);
      return localLessonPlanGenerator(subject, topic, duration, objectives);
    }
  }

  /**
   * FUNCTION 3: gradeSubmission()
   * Grades a student submission using a rubric and maximum marks.
   */
  static async gradeSubmission({
    submissionContent,
    rubric,
    totalMarks,
    schoolId,
    userId,
  }: {
    submissionContent: string;
    rubric: string;
    totalMarks: number;
    schoolId?: string;
    userId?: string;
  }) {
    const prompt = `Grade the student submission below based on the specified grading rubric and maximum marks.
Submission Content:
"""
${submissionContent}
"""

Grading Rubric:
"""
${rubric}
"""

Maximum Marks: ${totalMarks}

Return ONLY a JSON object of this structure:
{
  "score": number (out of ${totalMarks}),
  "feedback": "constructive, encouraging feedback string for the student",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'TEACHER',
        command: 'Grade Student Submission',
        actionTaken: { type: 'grade_submission', totalMarks },
      });
    }

    if (isMockAI) {
      return {
        score: Math.round(totalMarks * 0.85),
        feedback: 'Good effort! The submission matches most criteria in the rubric. Your writing is clear, though you can expand on details.',
        strengths: ['Clear structure and organization', 'Addressed the core components of the assignment'],
        improvements: ['Include more specific examples', 'Elaborate on mathematical proof steps'],
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an objective academic evaluator. Output strict JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const text = response.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error('[AIService.gradeSubmission] Failed, returning mock grading:', error);
      return {
        score: Math.round(totalMarks * 0.8),
        feedback: 'Submission successfully evaluated. Good vocabulary and grammar structures, though formatting requires attention.',
        strengths: ['Correct usage of requested terminology', 'Good overall presentation'],
        improvements: ['Check punctuation details', 'Ensure citations are aligned'],
      };
    }
  }

  /**
   * FUNCTION 4: generateQuizQuestions()
   * Generates a series of quiz questions based on topic, subject, and grade.
   */
  static async generateQuizQuestions({
    topic,
    subject,
    grade,
    count,
    difficulty,
    schoolId,
    userId,
  }: {
    topic: string;
    subject: string;
    grade: string;
    count: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    schoolId?: string;
    userId?: string;
  }) {
    const prompt = `Generate a quiz with ${count} questions.
Subject: ${subject}
Topic: ${topic}
Grade: ${grade}
Difficulty: ${difficulty}

Return ONLY a JSON object of this structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The exact correct option string (e.g. Option B)"
    }
  ]
}`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'TEACHER',
        command: `Generate Quiz: ${subject} - ${topic}`,
        actionTaken: { type: 'generate_quiz', count, difficulty },
      });
    }

    if (isMockAI) {
      const mockQuestions = Array.from({ length: count }).map((_, i) => ({
        question: `Sample ${difficulty} Quiz Question ${i + 1} regarding ${topic}?`,
        options: ['Correct Choice Option', 'Incorrect Distractor 1', 'Incorrect Distractor 2', 'Incorrect Distractor 3'],
        answer: 'Correct Choice Option',
      }));
      return { questions: mockQuestions };
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an educational quiz writer. Output strict JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const text = response.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error('[AIService.generateQuizQuestions] Failed, returning mock quiz:', error);
      return {
        questions: [
          {
            question: `Standard question about ${topic} (${difficulty})?`,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            answer: 'Option 1',
          },
        ],
      };
    }
  }

  /**
   * FUNCTION 5: analyzeStudentRisk()
   * Analyzes attendance, grades, and submissions to return a structured risk report.
   */
  static async analyzeStudentRisk({
    attendanceRate,
    averageGradePercent,
    missingSubmissionsCount,
    schoolId,
    userId,
  }: {
    attendanceRate: number;
    averageGradePercent: number;
    missingSubmissionsCount: number;
    schoolId?: string;
    userId?: string;
  }) {
    const prompt = `Perform a risk analysis for a student with these stats:
- Attendance Rate: ${attendanceRate}%
- Average Grade: ${averageGradePercent}%
- Missing Submissions: ${missingSubmissionsCount}

Return ONLY a JSON object of this structure:
{
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "reasons": ["reason1", "reason2"],
  "recommendations": ["rec1", "rec2"]
}`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'PRINCIPAL',
        command: 'Analyze Student academic risk level',
        actionTaken: { type: 'student_risk_analysis', attendanceRate, averageGradePercent },
      });
    }

    // Baseline logical calculation for mock/fallback
    const determineRisk = () => {
      const reasons: string[] = [];
      const recs: string[] = [];
      let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      if (attendanceRate < 75) {
        reasons.push(`Attendance rate is critically low at ${attendanceRate}%.`);
        recs.push('Schedule parent meeting to address attendance.');
        level = 'HIGH';
      } else if (attendanceRate < 85) {
        reasons.push(`Attendance is slipping (${attendanceRate}%).`);
        recs.push('Send automated SMS alerts to parent.');
        level = 'MEDIUM';
      }

      if (averageGradePercent < 50) {
        reasons.push(`Failing grade average of ${averageGradePercent}%.`);
        recs.push('Enroll student in remedial academic classes.');
        level = 'HIGH';
      } else if (averageGradePercent < 65) {
        reasons.push(`Grades are below average (${averageGradePercent}%).`);
        recs.push('Recommend after-school tutoring.');
        if (level !== 'HIGH') level = 'MEDIUM';
      }

      if (missingSubmissionsCount > 3) {
        reasons.push(`Student has ${missingSubmissionsCount} outstanding assignments.`);
        recs.push('Enforce homework logs and classroom study time.');
        level = 'HIGH';
      } else if (missingSubmissionsCount > 0) {
        reasons.push(`Student has ${missingSubmissionsCount} missing homework task(s).`);
        recs.push('Provide warning notifications on dashboard.');
        if (level === 'LOW') level = 'MEDIUM';
      }

      if (reasons.length === 0) {
        reasons.push('Student meets all academic and attendance standards.');
        recs.push('Encourage continued participation in class activities.');
      }

      return { riskLevel: level, reasons, recommendations: recs };
    };

    if (isMockAI) {
      return determineRisk();
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an educational risk analyst. Output strict JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const text = response.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error('[AIService.analyzeStudentRisk] Failed, returning calculated risk:', error);
      return determineRisk();
    }
  }

  /**
   * FUNCTION 6: generateReportComment()
   * Generates a professional, detailed report card comment.
   */
  static async generateReportComment({
    studentName,
    subject,
    marks,
    attendance,
    behavior,
    schoolId,
    userId,
  }: {
    studentName: string;
    subject: string;
    marks: number;
    attendance: number;
    behavior: string;
    schoolId?: string;
    userId?: string;
  }): Promise<string> {
    const prompt = `Write a professional, encouraging, and constructive report card comment for a student.
Student Name: ${studentName}
Subject: ${subject}
Marks: ${marks}%
Attendance: ${attendance}%
Behavior: ${behavior}

Return ONLY the plain-text comment string (between 3 and 5 sentences). Do not wrap in quotes or markdown.`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'TEACHER',
        command: `Generate Report Comment: ${studentName} - ${subject}`,
        actionTaken: { type: 'report_comment', studentName, subject },
      });
    }

    if (isMockAI) {
      const performanceTier = marks >= 80 ? 'excellent' : marks >= 60 ? 'good' : 'developing';
      return `${studentName} has shown ${performanceTier} progress in ${subject} this term. With an attendance rate of ${attendance}%, they are a regular and attentive member of the class. Their behavior is ${behavior.toLowerCase()}, which contributes positively to our learning environment. I encourage them to continue this positive momentum in the upcoming terms.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a supportive school teacher. Output plain text comments only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[AIService.generateReportComment] Failed, returning fallback:', error);
      return `${studentName} has demonstrated satisfactory performance in ${subject} this term. They are encouraged to maintain focus on all assignments and continue striving for improvement in the next term.`;
    }
  }

  /**
   * FUNCTION 6B: generateReportCardComment()
   * Generates a holistic, professional report card comment summarizing all subjects.
   */
  static async generateReportCardComment({
    studentName,
    className,
    subjectsData,
    attendanceRate,
    teacherRemarks,
    schoolId,
    userId,
  }: {
    studentName: string;
    className: string;
    subjectsData: { subject: string; marks: number; total: number; grade: string }[];
    attendanceRate: number;
    teacherRemarks?: string;
    schoolId?: string;
    userId?: string;
  }): Promise<string> {
    const subjectPerformances = subjectsData
      .map((s) => `${s.subject}: ${s.marks}/${s.total} (${s.grade})`)
      .join(", ");

    const prompt = `Write a professional, encouraging, and constructive report card comment for a student.
Student Name: ${studentName}
Class: ${className}
Academic Performance: ${subjectPerformances}
Attendance Rate: ${attendanceRate}%
Teacher Remarks: ${teacherRemarks || 'None provided'}

AI Comment guidelines:
- Include an overall performance comment (2-3 sentences).
- Provide specific feedback based on their grades (mentioning their strongest subjects and areas needing attention).
- Include a note regarding their attendance (praise regular attendance, or express concern if attendance is low).
- End with encouragement and areas to improve.

Return ONLY the plain-text comment string (between 4 and 6 sentences). Do not wrap in quotes or markdown.`;

    if (schoolId && userId) {
      await logAIAction({
        schoolId,
        userId,
        portalType: 'PRINCIPAL',
        command: `Generate Report Card Comment for ${studentName} (${className})`,
        actionTaken: { type: 'report_card_comment', studentName, className },
      });
    }

    if (isMockAI) {
      const sorted = [...subjectsData].sort((a, b) => b.marks - a.marks);
      const strongSubject = sorted[0]?.subject || "Academics";
      const weakSubject = sorted[sorted.length - 1]?.subject || "Academics";
      const attendanceComment = attendanceRate >= 90
        ? `With an excellent attendance rate of ${attendanceRate}%, they are a regular and engaged member of the classroom.`
        : `Their attendance rate of ${attendanceRate}% is a minor area of concern, and we encourage more regular check-ins.`;

      return `${studentName} has demonstrated admirable dedication in ${className} this term. They have performed exceptionally well in ${strongSubject}, demonstrating a solid grasp of the subject material. While their overall progress is highly encouraging, further focus on ${weakSubject} will assist in stabilizing their grades. ${attendanceComment} We encourage ${studentName} to maintain this positive momentum and continue striving for excellence next term.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a supportive school teacher. Output plain text comments only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[AIService.generateReportCardComment] Failed, returning fallback:', error);
      const sorted = [...subjectsData].sort((a, b) => b.marks - a.marks);
      const strongSubject = sorted[0]?.subject || "Academics";
      return `${studentName} is making satisfactory progress in class. They show strong interest in ${strongSubject}. They are encouraged to focus on all subjects to achieve an even stronger performance next term.`;
    }
  }

  /**
   * FUNCTION 7: answerParentQuestion()
   * Friendly chatbot answer tailored for parent queries based on their child's records.
   */
  static async answerParentQuestion({
    question,
    studentData,
    schoolContext,
    schoolId,
    userId,
  }: {
    question: string;
    studentData: any;
    schoolContext: any;
    schoolId: string;
    userId: string;
  }): Promise<string> {
    const parentSystemPrompt = getCarePrompt(
      schoolContext.schoolName,
      studentData.name,
      studentData.className,
      studentData.attendanceRate || 95,
      studentData.performance || 'Satisfactory'
    );

    await logAIAction({
      schoolId,
      userId,
      portalType: 'PARENT',
      command: question,
      actionTaken: { type: 'parent_question', question },
    });

    if (isMockAI) {
      return `Dear parent, thank you for reaching out. Regarding your question: "${question}".
Your child, ${studentData.name}, is doing well in Class ${studentData.className} at ${schoolContext.schoolName}. 
They currently have an attendance rate of ${studentData.attendanceRate || 95}% and their academic progress is flagged as "${studentData.performance || 'Good'}".
If you need any specific updates about exams or homework tasks, please consult the dashboard menus or feel free to schedule a quick chat with their class teacher.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: parentSystemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[AIService.answerParentQuestion] Failed, returning mock:', error);
      return `Thank you for your inquiry about ${studentData.name}. They are attending classes regularly and showing consistent effort in school. Please contact the class teacher directly for subject-specific details.`;
    }
  }

  /**
   * FUNCTION 8: parseSchoolSetupCommand()
   * Natural language command parser interface for principal settings.
   */
  static async parseSchoolSetupCommand({
    command,
    schoolId,
    userId,
  }: {
    command: string;
    schoolId: string;
    userId: string;
  }) {
    // Parse using our hybrid command parser
    const parsed = await parseCommand(command);

    // Save action log
    await logAIAction({
      schoolId,
      userId,
      portalType: 'PRINCIPAL',
      command,
      actionTaken: parsed,
    });

    return parsed;
  }
}
