"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Play,
  CheckCircle,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface StudentQuizClientProps {
  quizId: string;
  studentId: string;
  studentName: string;
}

export default function StudentQuizClient({
  quizId,
  studentId,
  studentName,
}: StudentQuizClientProps) {
  const router = useRouter();

  // Quiz details & questions
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Take quiz states
  const [quizState, setQuizState] = useState<"intro" | "taking" | "submitted">("intro");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // { questionId: selectedOption }
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [result, setResult] = useState<any>(null);

  // Check if already taken in localStorage
  useEffect(() => {
    const pastResult = localStorage.getItem(`quiz_sub_${studentId}_${quizId}`);
    if (pastResult) {
      setResult(JSON.parse(pastResult));
      setQuizState("submitted");
    }
  }, [quizId, studentId]);

  // Load quiz details
  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const res = await fetch(`/api/parent/quizzes/${quizId}/submit`);
        if (!res.ok) throw new Error("Failed to load quiz details");
        const data = await res.json();
        setQuizDetails(data);
        if (data.timeLimit) {
          setTimeLeft(data.timeLimit * 60);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Could not fetch quiz questions.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizId]);

  // Quiz Timer Countdown Loop
  useEffect(() => {
    if (quizState !== "taking" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning("Time is up! Submitting your quiz answers automatically.");
          handleSubmitQuiz(true); // Force auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, timeLeft]);

  // Start Quiz
  const handleStartQuiz = () => {
    if (!quizDetails?.questions || quizDetails.questions.length === 0) {
      toast.error("No questions available in this quiz.");
      return;
    }
    setQuizState("taking");
    if (quizDetails.timeLimit) {
      setTimeLeft(quizDetails.timeLimit * 60);
    }
  };

  // Select Option
  const handleSelectOption = (questionId: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Navigations
  const handleNext = () => {
    if (currentQuestionIdx < quizDetails.questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
    }
  };

  // Submit Quiz Action
  const handleSubmitQuiz = async (forceAutoSubmit = false) => {
    const questions = quizDetails.questions;
    const unansweredCount = questions.length - Object.keys(answers).length;

    if (unansweredCount > 0 && !forceAutoSubmit) {
      const confirmProceed = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/parent/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          answers,
        }),
      });

      if (!res.ok) throw new Error("Could not evaluate quiz results");
      const evalData = await res.json();

      setResult(evalData);
      setQuizState("submitted");
      // Save result to localStorage for persistent state checks
      localStorage.setItem(`quiz_sub_${studentId}_${quizId}`, JSON.stringify(evalData));
      toast.success("Quiz submitted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to evaluate quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Quiz (only allowed for testing or mock environment)
  const handleResetQuiz = () => {
    const confirmReset = window.confirm("Reset this quiz attempt? This will let you take it again.");
    if (confirmReset) {
      localStorage.removeItem(`quiz_sub_${studentId}_${quizId}`);
      setAnswers({});
      setCurrentQuestionIdx(0);
      setResult(null);
      setQuizState("intro");
      toast.info("Quiz attempt reset.");
    }
  };

  // Timer format helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 text-gray-500 text-sm">
        Loading quiz assessment sheet...
      </div>
    );
  }

  const { title, subject, questions } = quizDetails;
  const currentQuestion = questions?.[currentQuestionIdx] || null;
  const isFinalQuestion = currentQuestionIdx === (questions?.length || 1) - 1;

  return (
    <div className="min-h-screen">
      {/* ── CASE 1: INTRO SCREEN ── */}
      {quizState === "intro" && (
        <div className="max-w-xl mx-auto space-y-6 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/parent/student-corner?childId=${studentId}`)}
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Online Quiz
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none mt-1">
                {title}
              </h1>
            </div>
          </div>

          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <HelpCircle className="size-5" />
              <h3 className="text-sm font-semibold text-white">Quiz Details & Instructions</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 pt-1">
              <div className="space-y-1">
                <span>Subject:</span>
                <p className="text-sm font-bold text-white">{subject}</p>
              </div>
              <div className="space-y-1">
                <span>Time Limit:</span>
                <p className="text-sm font-bold text-white">{quizDetails.timeLimit ? `${quizDetails.timeLimit} Minutes` : "No Limit"}</p>
              </div>
              <div className="space-y-1">
                <span>Questions:</span>
                <p className="text-sm font-bold text-white">{questions.length} Items</p>
              </div>
              <div className="space-y-1">
                <span>Student:</span>
                <p className="text-sm font-bold text-white">{studentName}</p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/[0.04] p-4 rounded-xl text-[11px] text-gray-500 leading-relaxed">
              <strong>Instructions:</strong> This is a timed assessment. Once you click &quot;Start Quiz&quot;, the timer will begin. Make sure you do not close or reload the browser tab, as your attempt progress will reset. Ensure all questions are answered before submitting.
            </div>

            <button
              onClick={handleStartQuiz}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-500/10 font-bold"
            >
              <Play className="size-3.5 fill-white" />
              Start Quiz
            </button>
          </Card>
        </div>
      )}

      {/* ── CASE 2: ACTIVE TIMED FOCUS PLAY TAKING MODE ── */}
      {quizState === "taking" && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-gray-950 p-6 flex flex-col justify-between overflow-y-auto select-none">
          {/* Header Bar */}
          <div className="max-w-3xl w-full mx-auto flex items-center justify-between pb-4 border-b border-white/[0.06] shrink-0">
            <div>
              <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest">{subject}</span>
              <h2 className="text-base font-bold text-white truncate max-w-[200px] sm:max-w-sm">{title}</h2>
            </div>

            {/* Countdown timer */}
            {quizDetails.timeLimit && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 font-mono text-sm shrink-0">
                <Clock className="size-4 animate-pulse" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* Central Question Panel */}
          <div className="max-w-3xl w-full mx-auto my-6 flex-1 flex flex-col justify-center space-y-6">
            {/* Progress track */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}% Complete</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-6 space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                {currentQuestion.text}
              </h3>

              {/* Options selectors */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {currentQuestion.options.map((option: string, oIdx: number) => {
                  // Option letter maps (MCQ: A, B, C, D; TF: True, False)
                  const optionLetters = ["A", "B", "C", "D"];
                  const isMCQ = currentQuestion.type === "MCQ";
                  const optionValue = isMCQ ? optionLetters[oIdx] : option;

                  const isSelected = answers[currentQuestion.id] === optionValue;

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, optionValue)}
                      className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/10 scale-[1.01]"
                          : "bg-black/20 border-white/[0.06] text-gray-300 hover:border-white/[0.12] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`size-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-white text-purple-700"
                              : "bg-white/[0.06] text-gray-400 border border-white/[0.08]"
                          }`}
                        >
                          {isMCQ ? optionLetters[oIdx] : oIdx === 0 ? "T" : "F"}
                        </span>
                        <span>{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="max-w-3xl w-full mx-auto flex items-center justify-between pt-4 border-t border-white/[0.06] shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIdx === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold py-2.5 px-4 rounded-lg border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="size-4" />
              Previous
            </button>

            {isFinalQuestion ? (
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600/20 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/10 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Submit Quiz
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1 text-xs font-semibold py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-500/10"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CASE 3: SUBMITTED RESULTS REVIEW DASHBOARD ── */}
      {quizState === "submitted" && result && (
        <div className="max-w-3xl mx-auto space-y-6 pt-6 select-none">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/parent/student-corner?childId=${studentId}`)}
                className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{subject}</span>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none mt-1">
                  {title}
                </h1>
              </div>
            </div>

            {/* Restart/Reset Quiz attempt */}
            <button
              onClick={handleResetQuiz}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <RefreshCw className="size-3.5" />
              Reset Attempt
            </button>
          </div>

          {/* Score details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Your Score</p>
              <p className="text-4xl font-black text-purple-400 mt-2">
                {result.score} <span className="text-xs text-gray-500 font-bold">/ {result.totalQuestions}</span>
              </p>
            </Card>

            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Quiz Percentage</p>
              <p className="text-4xl font-black text-white mt-2">
                {result.percentage}%
              </p>
            </Card>

            {/* Motivational review */}
            <Card
              className={`border rounded-xl p-5 flex flex-col justify-center items-center text-center ${
                result.percentage >= 80
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                  : result.percentage >= 60
                  ? "border-blue-500/20 bg-blue-500/5 text-blue-400"
                  : "border-rose-500/20 bg-rose-500/5 text-rose-400"
              }`}
            >
              <Award className="size-8 mb-2" />
              <p className="text-sm font-bold leading-tight">
                {result.percentage >= 80
                  ? "Well done! Outstanding work! 🎓"
                  : result.percentage >= 60
                  ? "Good job! Keep practicing! 💪"
                  : "Keep practicing! You can do better! 📚"}
              </p>
            </Card>
          </div>

          {/* Answers Breakdown Roster */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider pl-1">
              Review Questions Checklist
            </h3>

            {result.evaluation.map((item: any, idx: number) => {
              const isMCQ = item.options && item.options.length > 2;

              return (
                <Card
                  key={item.id}
                  className={`border rounded-xl p-4 space-y-3 ${
                    item.isCorrect
                      ? "border-emerald-500/10 bg-emerald-950/5"
                      : "border-rose-500/10 bg-rose-950/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      Q{idx + 1}. {item.text}
                    </h4>

                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        <CheckCircle className="size-3" />
                        Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
                        <XCircle className="size-3" />
                        Incorrect
                      </span>
                    )}
                  </div>

                  {/* Render Options checklist showing user selection and correct value */}
                  {isMCQ ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {item.options.map((opt: string, oIdx: number) => {
                        const optLetters = ["A", "B", "C", "D"];
                        const isUserAnswer = item.userAnswer === optLetters[oIdx];
                        const isCorrectAnswer = item.correctAnswer === optLetters[oIdx];

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                              isCorrectAnswer
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold"
                                : isUserAnswer
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : "bg-black/20 border-white/[0.04] text-gray-400"
                            }`}
                          >
                            <span className="truncate">{optLetters[oIdx]}. {opt}</span>
                            {isCorrectAnswer && <span className="text-[9px] font-bold text-emerald-400 shrink-0">Correct Answer</span>}
                            {isUserAnswer && !isCorrectAnswer && <span className="text-[9px] font-bold text-rose-400 shrink-0">Your Select</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex gap-2 text-xs pt-1">
                      {["True", "False"].map((opt) => {
                        const isUserAnswer = item.userAnswer === opt;
                        const isCorrectAnswer = item.correctAnswer === opt;

                        return (
                          <div
                            key={opt}
                            className={`flex-1 p-2.5 rounded-lg border text-center ${
                              isCorrectAnswer
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold"
                                : isUserAnswer
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : "bg-black/20 border-white/[0.04] text-gray-400"
                            }`}
                          >
                            {opt}
                            {isCorrectAnswer && <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">Correct Answer</span>}
                            {isUserAnswer && !isCorrectAnswer && <span className="text-[9px] font-bold text-rose-400 block mt-0.5">Your Select</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation card */}
                  <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl text-[11px] text-gray-500 leading-relaxed">
                    <strong>Explanation:</strong> {item.explanation}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
