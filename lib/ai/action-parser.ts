import openai, { isMockAI } from './openai-client';

export type ParsedActionType =
  | 'CREATE_CLASSES'
  | 'ADD_SUBJECTS'
  | 'SET_FEES'
  | 'GET_REPORT'
  | 'SEND_ANNOUNCEMENT'
  | 'GET_STUDENT_INFO'
  | 'MARK_ATTENDANCE'
  | 'SCHEDULE_EXAM'
  | 'UNKNOWN';

export interface ParsedAction {
  actionType: ParsedActionType;
  parameters: Record<string, any>;
  confirmation: string;
}

/**
 * Parsed action schema rules for OpenAI system prompt.
 */
const PARSER_SYSTEM_PROMPT = `You are a school management command parser. Parse natural language into structured JSON actions.
Supported action types and parameters format:
- CREATE_CLASSES: { grades: number[], sections: string[] }
- ADD_SUBJECTS: { subjects: string[], targetGrades: number[] }
- SET_FEES: { feeStructure: { type: "TUITION" | "TRANSPORT" | "LAB" | "SPORTS" | "OTHER", amount: number, gradeLevel?: number }[] }
- GET_REPORT: { reportType: "ATTENDANCE" | "FEE" | "ACADEMIC" | "PERFORMANCE", filters: Record<string, any> }
- SEND_ANNOUNCEMENT: { title: string, content: string, target: "ALL" | "TEACHER" | "PARENT" | "STUDENT" }
- GET_STUDENT_INFO: { studentName?: string, className?: string }
- MARK_ATTENDANCE: { classId: string, date: string, records: { studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" }[] }
- SCHEDULE_EXAM: { subject: string, className: string, date: string, marks: number }

Response format MUST be a strict JSON object:
{
  "actionType": "CREATE_CLASSES" | "ADD_SUBJECTS" | "SET_FEES" | "GET_REPORT" | "SEND_ANNOUNCEMENT" | "GET_STUDENT_INFO" | "MARK_ATTENDANCE" | "SCHEDULE_EXAM" | "UNKNOWN",
  "parameters": { ... },
  "confirmation": "A natural language confirmation message in the user's language summarizing the action to be performed."
}`;

/**
 * Rules-based parser used as a fallback or in mock mode.
 */
function ruleBasedParse(text: string): ParsedAction {
  const normalized = text.toLowerCase();

  // 1. Create classes
  if (normalized.includes('class') && (normalized.includes('create') || normalized.includes('add') || normalized.includes('new'))) {
    const grades: number[] = [];
    const sections: string[] = [];
    
    // Attempt simple extraction
    const gradeMatches = normalized.match(/grade\s*(\d+)/gi);
    if (gradeMatches) {
      gradeMatches.forEach(m => {
        const num = m.match(/\d+/);
        if (num) grades.push(parseInt(num[0]));
      });
    } else {
      // Default fallback
      grades.push(5);
    }
    
    const sectionMatches = normalized.match(/section\s*([a-d])/gi);
    if (sectionMatches) {
      sectionMatches.forEach(m => {
        const char = m.match(/([a-d])/i);
        if (char) sections.push(char[0].toUpperCase());
      });
    } else {
      sections.push('A');
    }

    return {
      actionType: 'CREATE_CLASSES',
      parameters: { grades, sections },
      confirmation: `Creating class(es) for Grade(s) ${grades.join(', ')} - Section(s) ${sections.join(', ')}.`,
    };
  }

  // 2. Add subjects
  if (normalized.includes('subject') && (normalized.includes('add') || normalized.includes('new') || normalized.includes('create'))) {
    const subjects: string[] = [];
    if (normalized.includes('math')) subjects.push('Mathematics');
    if (normalized.includes('science')) subjects.push('Science');
    if (normalized.includes('english')) subjects.push('English');
    if (subjects.length === 0) subjects.push('General Studies');

    return {
      actionType: 'ADD_SUBJECTS',
      parameters: { subjects, targetGrades: [5, 6] },
      confirmation: `Adding subject(s): ${subjects.join(', ')} for Grades 5 and 6.`,
    };
  }

  // 3. Set fees
  if (normalized.includes('fee') && (normalized.includes('set') || normalized.includes('update') || normalized.includes('charge'))) {
    const amountMatch = normalized.match(/rs\.?\s*(\d+)|(\d+)\s*rupees|(\d+)\s*pkr/i);
    const amount = amountMatch ? parseInt(amountMatch[1] || amountMatch[2] || amountMatch[3]) : 3000;
    
    return {
      actionType: 'SET_FEES',
      parameters: {
        feeStructure: [{ type: 'TUITION', amount, gradeLevel: 5 }]
      },
      confirmation: `Updating Tuition Fee structure to Rs. ${amount} for Grade 5.`,
    };
  }

  // 4. Send announcement
  if (normalized.includes('announce') || normalized.includes('announcement') || normalized.includes('notice')) {
    return {
      actionType: 'SEND_ANNOUNCEMENT',
      parameters: {
        title: 'School Announcement',
        content: text,
        target: normalized.includes('teacher') ? 'TEACHER' : normalized.includes('parent') ? 'PARENT' : 'ALL',
      },
      confirmation: 'Sending out school-wide announcement to recipients.',
    };
  }

  // 5. Get student info
  if (normalized.includes('student') || normalized.includes('profile') || normalized.includes('find') || normalized.includes('info')) {
    const names = ['ali', 'zainab', 'hamza', 'ahmed', 'sara'];
    let studentName = 'Ali Ahmed';
    for (const name of names) {
      if (normalized.includes(name)) {
        studentName = name.charAt(0).toUpperCase() + name.slice(1);
        break;
      }
    }

    return {
      actionType: 'GET_STUDENT_INFO',
      parameters: { studentName },
      confirmation: `Retrieving academic and attendance profile info for student "${studentName}".`,
    };
  }

  // 6. Schedule exam
  if (normalized.includes('exam') || normalized.includes('test') || normalized.includes('schedule')) {
    return {
      actionType: 'SCHEDULE_EXAM',
      parameters: {
        subject: normalized.includes('math') ? 'Mathematics' : 'English',
        className: 'Grade 5-A',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        marks: 50,
      },
      confirmation: 'Scheduling upcoming examination paper details.',
    };
  }

  // 7. Get Report
  if (normalized.includes('report') || normalized.includes('performance') || normalized.includes('summary')) {
    return {
      actionType: 'GET_REPORT',
      parameters: {
        reportType: normalized.includes('fee') ? 'FEE' : normalized.includes('attendance') ? 'ATTENDANCE' : 'ACADEMIC',
        filters: {}
      },
      confirmation: 'Generating detailed data report based on selection.',
    };
  }

  // Default unknown command
  return {
    actionType: 'UNKNOWN',
    parameters: {},
    confirmation: 'I did not recognize the specific action in your request. Please rephrase e.g. "Create class Grade 5-A" or "Announce parent meeting tomorrow".',
  };
}

/**
 * Parses natural language input into structured command parameters.
 */
export async function parseCommand(text: string): Promise<ParsedAction> {
  if (isMockAI) {
    return ruleBasedParse(text);
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: PARSER_SYSTEM_PROMPT },
        { role: 'user', content: `Command: "${text}"` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as ParsedAction;
    return parsed;
  } catch (error) {
    console.error('[ActionParser] OpenAI parsing failed, falling back to rule-based parser:', error);
    return ruleBasedParse(text);
  }
}
