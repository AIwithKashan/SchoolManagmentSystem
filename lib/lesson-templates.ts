export interface LessonBreakdownItem {
  title: string;
  duration: number; // in minutes
  description: string;
}

export interface LessonPlanContent {
  objectives: string[];
  breakdown: LessonBreakdownItem[];
  resources: string[];
  assessment: string;
}

export function generateLessonPlan(
  subject: string,
  topic: string,
  duration: number,
  objectivesInput?: string,
  specialInstructions?: string
): LessonPlanContent {
  const normSubject = subject.toLowerCase().trim();

  // Base objectives
  const customObjectives = objectivesInput
    ? objectivesInput.split("\n").filter((o) => o.trim().length > 0)
    : [];

  const instructionsText = specialInstructions
    ? `\n*Note on Student Needs: ${specialInstructions}*`
    : "";

  if (normSubject.includes("math")) {
    return {
      objectives: customObjectives.length > 0 ? customObjectives : [
        `Understand the fundamental principles of ${topic}.`,
        `Apply mathematical formulas to solve problems related to ${topic}.`,
        `Demonstrate critical thinking by answering practice exercises.`,
      ],
      breakdown: [
        {
          title: "Warm Up & Conceptual Review",
          duration: Math.round(duration * 0.15),
          description: `Introduce ${topic} with a real-life analogy. Hook students' interest using a simple interactive board puzzle.${instructionsText}`,
        },
        {
          title: "Main Teaching & Formulas",
          duration: Math.round(duration * 0.5),
          description: `Explain the key concepts of ${topic} step by step. Write down core formulas on the board. Work through 3 distinct practice examples showing every logical step.`,
        },
        {
          title: "Guided Student Activity",
          duration: Math.round(duration * 0.25),
          description: `Divide students into pairs. Have them solve a worksheet with 5 targeted practice problems. Walk around to provide assistance, especially focusing on weaker areas.`,
        },
        {
          title: "Summary & Homework Assignment",
          duration: Math.round(duration * 0.1),
          description: `Recap key formulas. Answer quick student questions. Assign homework problems from textbook chapter on ${topic}.`,
        },
      ],
      resources: [
        "Whiteboard and colored markers",
        "Printed Math practice worksheets",
        "Textbook chapter pages",
      ],
      assessment: "Collect worksheets at the end of class; grade based on correct logical steps.",
    };
  }

  if (normSubject.includes("science")) {
    return {
      objectives: customObjectives.length > 0 ? customObjectives : [
        `Explain the core scientific process of ${topic}.`,
        `Identify and label key parts of the diagram representing ${topic}.`,
        `Hypothesize and observe outcomes related to the concept.`,
      ],
      breakdown: [
        {
          title: "Warm Up / Scientific Inquiry",
          duration: Math.round(duration * 0.15),
          description: `Ask students: "Have you ever wondered how this happens in nature?" Show an engaging image or diagram representing ${topic} to spark interest.${instructionsText}`,
        },
        {
          title: "Main Conceptual Teaching",
          duration: Math.round(duration * 0.45),
          description: `Present the step-by-step breakdown of ${topic}. Draw a clean conceptual diagram on the whiteboard. Explain variables and natural conditions.`,
        },
        {
          title: "Interactive Experiment / Diagram Drawing",
          duration: Math.round(duration * 0.3),
          description: `Have students draw and label their own detailed diagram of ${topic} in their notebooks. Alternatively, run a brief mini-demonstration using classroom lab kits.`,
        },
        {
          title: "Wrap-up & Homework Discussion",
          duration: Math.round(duration * 0.1),
          description: `Verify students' diagram labels. Summarize the natural cycle. Assign Q1-5 on Page 45 of the science reader.`,
        },
      ],
      resources: [
        "Science journal/notebooks",
        "Colored markers for drawing diagrams",
        "Whiteboard and printed labels",
      ],
      assessment: "Perform a quick 5-question MCQ verbal pop quiz to test concept retention.",
    };
  }

  if (normSubject.includes("english")) {
    return {
      objectives: customObjectives.length > 0 ? customObjectives : [
        `Analyze the central theme and grammar structures in the context of ${topic}.`,
        `Construct original paragraphs demonstrating usage of vocabulary terms.`,
        `Practice pronunciation and reading fluency.`,
      ],
      breakdown: [
        {
          title: "Warm Up & Vocabulary Builder",
          duration: Math.round(duration * 0.15),
          description: `Write 5 new words related to ${topic} on the board. Conduct a quick sentence-making game with the class.${instructionsText}`,
        },
        {
          title: "Reading & Textual Analysis",
          duration: Math.round(duration * 0.45),
          description: `Read the selected text passage on ${topic} aloud. Have students participate in turn-taking reading. Discuss paragraphs and identify grammar patterns.`,
        },
        {
          title: "Creative Writing Exercise",
          duration: Math.round(duration * 0.3),
          description: `Ask students to write a short paragraph (5-8 sentences) incorporating the new vocabulary words and exploring the theme of ${topic}.`,
        },
        {
          title: "Fluency Recap & Reading Assignment",
          duration: Math.round(duration * 0.1),
          description: `Select two students to share their paragraphs. Review common pronunciation mistakes. Assign textbook comprehension questions.`,
        },
      ],
      resources: [
        "English English textbook/anthology",
        "Vocabulary flashcards",
        "Writing journals",
      ],
      assessment: "Collect paragraph notebooks to assess vocabulary usage and grammatical syntax.",
    };
  }

  if (normSubject.includes("urdu")) {
    return {
      objectives: customObjectives.length > 0 ? customObjectives : [
        `${topic} کے بنیادی الفاظ اور تراکیب کا درست استعمال سیکھنا۔`,
        `نثری پارے یا شعر کی تشریح اپنے الفاظ میں بیان کرنا۔`,
        `خوش خطی اور تلفظ کی مشق کرنا۔`,
      ],
      breakdown: [
        {
          title: "تعارفی گفتگو اور ذخیرہ الفاظ",
          duration: Math.round(duration * 0.15),
          description: `عنوان ${topic} کا تعارف کرائیں۔ تختہ تحریر پر نئے الفاظ لکھیں اور ان کے معنی بتائیں۔${instructionsText}`,
        },
        {
          title: "تفہیم اور پڑھائی",
          duration: Math.round(duration * 0.45),
          description: `درسی کتاب سے منتخب پیراگراف یا اشعار کی باری باری پڑھائی کرائیں۔ گرامر کے قواعد کی نشاندہی کریں۔`,
        },
        {
          title: "تحریری سرگرمی (تشریح)",
          duration: Math.round(duration * 0.3),
          description: `طالب علموں کو درسی اقتباس کی تشریح اپنے الفاظ میں لکھنے کی مشق کروائیں۔ خوش خط لکھنے کی تاکید کریں۔`,
        },
        {
          title: "خلاصہ اور ہوم ورک",
          duration: Math.round(duration * 0.1),
          description: `سبق کے اہم نکات کا اعادہ۔ گھر کے کام کے لیے مشق کے سوالات نمبر 1 تا 3 دیں۔`,
        },
      ],
      resources: [
        "اردو کی درسی کتاب",
        "تختہ تحریر اور چاک/مارکر",
        "املا کی کاپیاں",
      ],
      assessment: "طالب علموں کی املا اور تشریح کی کاپیاں چیک کر کے تعمیری رائے دینا۔",
    };
  }

  // General Template fallback
  return {
    objectives: customObjectives.length > 0 ? customObjectives : [
      `Understand the core concepts of ${topic} within ${subject}.`,
      `Synthesize information to complete tasks and worksheets.`,
      `Engage in class discussion and answer review questions.`,
    ],
    breakdown: [
      {
        title: "Introduction & Warm Up",
        duration: Math.round(duration * 0.15),
        description: `Hook student attention. Write the topic "${topic}" on the board and brainstorm what students already know about it.${instructionsText}`,
      },
      {
        title: "Direct Instruction",
        duration: Math.round(duration * 0.5),
        description: `Present the lesson material on ${topic}. Highlight major terms, definitions, and theories. Use charts or board illustrations.`,
      },
      {
        title: "Interactive Class Activity",
        duration: Math.round(duration * 0.25),
        description: `Engage students in a group discussion or independent worksheet activity to apply their understanding.`,
      },
      {
        title: "Lesson Wrap-up & Homework",
        duration: Math.round(duration * 0.1),
        description: `Review learning objectives. Address final questions. Assign relevant chapter exercises for homework.`,
      },
    ],
    resources: [
      "Whiteboard/Marker or Presentation Slides",
      "Class handouts and student notebooks",
    ],
    assessment: "Exit Ticket: Have students write one thing they learned and one question they still have before leaving.",
  };
}
