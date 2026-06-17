import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to generate dynamic questions based on quiz ID / title
function getQuizQuestions(quizId: string): { questions: any[]; title: string; subject: string } {
  let subject = "General Knowledge";
  let title = "General Knowledge Quiz";
  
  if (quizId.toLowerCase().includes("math")) {
    subject = "Mathematics";
    title = "Mathematics Chapter Assessment";
  } else if (quizId.toLowerCase().includes("sci") || quizId.toLowerCase().includes("biol") || quizId.toLowerCase().includes("chem")) {
    subject = "Science";
    title = "Science Concepts Evaluation";
  } else if (quizId.toLowerCase().includes("eng") || quizId.toLowerCase().includes("lit")) {
    subject = "English Language";
    title = "English Grammatical Diagnostics";
  }

  const mathQuestions = [
    {
      id: 1,
      text: "Solve: 2/3 + 1/6 = ?",
      type: "MCQ",
      options: ["5/6", "3/9", "4/6", "1/2"],
      correctAnswer: "A",
      explanation: "2/3 is equivalent to 4/6. Adding 1/6 gives 5/6.",
    },
    {
      id: 2,
      text: "What is the value of x in the equation: 3x - 7 = 14?",
      type: "MCQ",
      options: ["x = 5", "x = 7", "x = 6", "x = 8"],
      correctAnswer: "B",
      explanation: "Add 7 to both sides: 3x = 21. Divide by 3: x = 7.",
    },
    {
      id: 3,
      text: "A triangle with all three sides of equal length is called an equilateral triangle.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Equilateral triangles have equal sides and equal internal angles of 60 degrees.",
    },
    {
      id: 4,
      text: "Which of these is a prime number?",
      type: "MCQ",
      options: ["9", "15", "21", "29"],
      correctAnswer: "D",
      explanation: "29 has no positive divisors other than 1 and itself, making it a prime number.",
    },
    {
      id: 5,
      text: "The square root of 225 is 15.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "15 multiplied by 15 equals 225.",
    },
  ];

  const scienceQuestions = [
    {
      id: 1,
      text: "Which gas do plants absorb from the atmosphere during photosynthesis?",
      type: "MCQ",
      options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
      correctAnswer: "B",
      explanation: "Plants absorb carbon dioxide and release oxygen during photosynthesis.",
    },
    {
      id: 2,
      text: "What is the chemical symbol for Water?",
      type: "MCQ",
      options: ["CO2", "O2", "H2O", "NaCl"],
      correctAnswer: "C",
      explanation: "Water molecules consist of two hydrogen atoms and one oxygen atom (H2O).",
    },
    {
      id: 3,
      text: "Sound travels faster in air than in water.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "Sound travels faster in water because water molecules are more packed than air molecules.",
    },
    {
      id: 4,
      text: "What is the powerhouse of the cell?",
      type: "MCQ",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Cytoplasm"],
      correctAnswer: "C",
      explanation: "Mitochondria generate chemical energy needed to power cell reactions.",
    },
    {
      id: 5,
      text: "Light from the Sun takes approximately 8 minutes to reach the Earth.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Light travels at 300,000 km/s and takes about 8 minutes and 20 seconds to traverse the distance from Sun to Earth.",
    },
  ];

  const englishQuestions = [
    {
      id: 1,
      text: "Identify the noun in the sentence: 'The swift cat jumped high.'",
      type: "MCQ",
      options: ["swift", "cat", "jumped", "high"],
      correctAnswer: "B",
      explanation: "'Cat' is a person, place, or thing, which makes it the noun.",
    },
    {
      id: 2,
      text: "Choose the correct spelling:",
      type: "MCQ",
      options: ["Accomodate", "Acommodate", "Accommodate", "Acomodate"],
      correctAnswer: "C",
      explanation: "The correct spelling has double 'c' and double 'm' (Accommodate).",
    },
    {
      id: 3,
      text: "The word 'rapidly' is an adjective.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "'Rapidly' describes an action, making it an adverb.",
    },
    {
      id: 4,
      text: "Select the antonym for 'Generous':",
      type: "MCQ",
      options: ["Kind", "Selfish", "Helpful", "Happy"],
      correctAnswer: "B",
      explanation: "Selfish is the opposite of generous.",
    },
    {
      id: 5,
      text: "A conjunction is used to connect words, phrases, or clauses.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Conjunctions like 'and', 'but', 'or' are connectors in grammar.",
    },
  ];

  const generalQuestions = [
    {
      id: 1,
      text: "How many continents are there on Earth?",
      type: "MCQ",
      options: ["5", "6", "7", "8"],
      correctAnswer: "C",
      explanation: "There are 7 continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia.",
    },
    {
      id: 2,
      text: "Which planet is known as the Red Planet?",
      type: "MCQ",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "B",
      explanation: "Mars is called the Red Planet because iron minerals in its soil oxidise, making it look red.",
    },
    {
      id: 3,
      text: "The Pacific Ocean is the largest ocean on Earth.",
      type: "TF",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "The Pacific Ocean covers more than 30% of the Earth's surface.",
    },
  ];

  if (subject === "Mathematics") return { questions: mathQuestions, title, subject };
  if (subject === "Science") return { questions: scienceQuestions, title, subject };
  if (subject === "English Language") return { questions: englishQuestions, title, subject };
  return { questions: generalQuestions, title, subject };
}

// GET: Returns quiz info and questions list
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;
    const quizDetails = getQuizQuestions(id);

    return NextResponse.json(quizDetails);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_QUIZ_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST: Evaluates answers and submits results
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;
    const { answers, studentId } = await req.json(); // answers is a record of { [questionId]: selectedAnswer }

    if (!studentId || !answers) {
      return errorResponse("Missing required fields", 400);
    }

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

    const quizDetails = getQuizQuestions(id);
    const questions = quizDetails.questions;

    let correctCount = 0;
    const evaluation = questions.map((q) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        id: q.id,
        text: q.text,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        options: q.options,
      };
    });

    const score = correctCount;
    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    return NextResponse.json({
      success: true,
      quizId: id,
      studentId,
      score,
      totalQuestions,
      percentage,
      evaluation,
      submittedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_QUIZ_SUBMIT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
