"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Edit,
  FileText,
  Loader2,
  Printer,
  Save,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { generateLessonPlan, LessonPlanContent } from "@/lib/lesson-templates";

interface ClassSubjectItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface CreateLessonPlanClientProps {
  classSubjects: ClassSubjectItem[];
}

type ModeType = "AI" | "MANUAL";

export default function CreateLessonPlanClient({
  classSubjects,
}: CreateLessonPlanClientProps) {
  const router = useRouter();

  // Extract distinct classes list
  const classesMap = new Map<string, string>();
  classSubjects.forEach((item) => {
    classesMap.set(item.classId, item.className);
  });
  const classesList = Array.from(classesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // State variables for wizard
  const [mode, setMode] = useState<ModeType>("AI");
  const [classId, setClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("40");
  const [objectivesInput, setObjectivesInput] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Filtered subjects based on classId selection
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // Update subjects list when classId changes
  useEffect(() => {
    if (!classId) {
      setSubjectsList([]);
      setSubjectName("");
      return;
    }

    const filtered = classSubjects
      .filter((item) => item.classId === classId)
      .map((item) => item.subjectName);

    // Get unique subjects
    const uniqueSubjects = Array.from(new Set(filtered));
    setSubjectsList(uniqueSubjects);

    if (uniqueSubjects.length > 0) {
      setSubjectName(uniqueSubjects[0]);
    } else {
      setSubjectName("");
    }
  }, [classId, classSubjects]);

  // AI Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlanContent | null>(null);

  // Manual Form States
  const [manualTitle, setManualTitle] = useState("");
  const [manualObjectives, setManualObjectives] = useState("");
  const [manualWarmUp, setManualWarmUp] = useState("");
  const [manualMainTeaching, setManualMainTeaching] = useState("");
  const [manualActivity, setManualActivity] = useState("");
  const [manualSummary, setManualSummary] = useState("");
  const [manualResources, setManualResources] = useState("");
  const [manualAssessment, setManualAssessment] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);

  // Handle AI Generation Request
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!classId || !subjectName || !topic) {
      toast.error("Please fill in Class, Subject and Topic fields.");
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);

    // Simulate AI Generation delay
    setTimeout(() => {
      try {
        const plan = generateLessonPlan(
          subjectName,
          topic,
          parseInt(duration),
          objectivesInput,
          specialInstructions
        );
        setGeneratedPlan(plan);
        toast.success("Afia successfully generated your lesson plan!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to generate template.");
      } finally {
        setIsGenerating(false);
      }
    }, 2200);
  };

  // Transition from AI Generated Output to Manual Editing
  const handleSwitchToManualEdit = () => {
    if (!generatedPlan) return;

    // Prefill all manual fields from generatedPlan
    const targetClassName = classesList.find((c) => c.id === classId)?.name || "";
    setManualTitle(`Lesson Plan: ${topic} (${targetClassName})`);
    setManualObjectives(generatedPlan.objectives.join("\n"));
    
    // Extract items from breakdown
    const warmUpItem = generatedPlan.breakdown.find((b) => b.title.toLowerCase().includes("warm"));
    const mainItem = generatedPlan.breakdown.find((b) => b.title.toLowerCase().includes("main") || b.title.toLowerCase().includes("teach"));
    const activityItem = generatedPlan.breakdown.find((b) => b.title.toLowerCase().includes("activity") || b.title.toLowerCase().includes("experiment"));
    const summaryItem = generatedPlan.breakdown.find((b) => b.title.toLowerCase().includes("summary") || b.title.toLowerCase().includes("wrap"));

    setManualWarmUp(warmUpItem ? `${warmUpItem.title} (${warmUpItem.duration} mins):\n${warmUpItem.description}` : "");
    setManualMainTeaching(mainItem ? `${mainItem.title} (${mainItem.duration} mins):\n${mainItem.description}` : "");
    setManualActivity(activityItem ? `${activityItem.title} (${activityItem.duration} mins):\n${activityItem.description}` : "");
    setManualSummary(summaryItem ? `${summaryItem.title} (${summaryItem.duration} mins):\n${summaryItem.description}` : "");
    
    setManualResources(generatedPlan.resources.join("\n"));
    setManualAssessment(generatedPlan.assessment);

    setMode("MANUAL");
    toast.info("Switched to manual edit mode with AI plan fields pre-filled.");
  };

  // Save AI Generated Plan to DB
  const handleSaveAIGenerated = async () => {
    if (!generatedPlan) return;

    setIsSaving(true);
    const targetClassName = classesList.find((c) => c.id === classId)?.name || "";
    try {
      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Lesson Plan: ${topic} (${targetClassName})`,
          classId,
          subject: subjectName,
          topic,
          duration,
          content: generatedPlan,
          isAIGenerated: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to save lesson plan");

      toast.success("AI Lesson plan saved successfully!");
      router.push("/teacher/lessons");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error saving lesson plan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Manual Plan to DB
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualTitle || !classId || !subjectName || !manualObjectives) {
      toast.error("Please fill in all required manual plan details.");
      return;
    }

    setIsSaving(true);
    try {
      // Reconstruct content payload matching the schema content structure
      const manualContent: LessonPlanContent = {
        objectives: manualObjectives.split("\n").filter((o) => o.trim().length > 0),
        breakdown: [
          {
            title: "Warm Up Activity",
            duration: Math.round(parseInt(duration) * 0.2),
            description: manualWarmUp,
          },
          {
            title: "Main Teaching Points",
            duration: Math.round(parseInt(duration) * 0.5),
            description: manualMainTeaching,
          },
          {
            title: "Student Active Task",
            duration: Math.round(parseInt(duration) * 0.2),
            description: manualActivity,
          },
          {
            title: "Summary & Homework Wrap-up",
            duration: Math.round(parseInt(duration) * 0.1),
            description: manualSummary,
          },
        ],
        resources: manualResources.split("\n").filter((r) => r.trim().length > 0),
        assessment: manualAssessment,
      };

      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          classId,
          subject: subjectName,
          topic: topic || "Manual Topic",
          duration,
          content: manualContent,
          isAIGenerated: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to save lesson plan");

      toast.success("Manual lesson plan saved successfully!");
      router.push("/teacher/lessons");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error saving lesson plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => router.push("/teacher/lessons")}
          className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lesson Planner
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            Create Lesson Plan
          </h1>
        </div>
      </div>

      {/* Mode selectors */}
      <div className="flex border-b border-white/[0.06] gap-6 print:hidden">
        <button
          onClick={() => setMode("AI")}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
            mode === "AI" ? "text-purple-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            AI Generator
          </span>
          {mode === "AI" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>

        <button
          onClick={() => setMode("MANUAL")}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
            mode === "MANUAL" ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Edit className="size-3.5" />
            Manual Creation
          </span>
          {mode === "MANUAL" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Forms Wrapper */}
      <div className="grid grid-cols-1 gap-6">
        {mode === "AI" ? (
          /* AI GENERATION TAB */
          <div className="space-y-6 print:hidden">
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-400" />
                  AI Generation Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-5">
                  {/* Select class and subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                        required
                      >
                        <option value="">Select a class...</option>
                        {classesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        disabled={!classId}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        required
                      >
                        {!classId ? (
                          <option value="">Select a class first...</option>
                        ) : (
                          subjectsList.map((subj, idx) => (
                            <option key={idx} value={subj}>
                              {subj}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Topic and Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Topic / Chapter Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Photosynthesis, Quadratic Equations"
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Lesson Duration (Minutes)
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                      >
                        <option value="30">30 Minutes</option>
                        <option value="40">40 Minutes</option>
                        <option value="45">45 Minutes</option>
                        <option value="60">60 Minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Learning Objectives (Optional)</span>
                      <span className="text-[10px] text-gray-500">One objective per line</span>
                    </label>
                    <textarea
                      value={objectivesInput}
                      onChange={(e) => setObjectivesInput(e.target.value)}
                      placeholder="e.g. Students will understand the raw materials needed for photosynthesis..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 resize-y"
                    />
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Special Instructions / Focus Areas
                    </label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Students are weak in basic chemistry formulas; include extra vocabulary guidance..."
                      rows={2}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 resize-y"
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isGenerating || !classId || !subjectName || !topic}
                      className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-purple-500/20"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Afia is creating your lesson plan...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          🤖 Generate Lesson Plan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* MANUAL CREATION TAB */
          <div className="print:hidden">
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Edit className="size-4 text-blue-400" />
                  Manual Lesson Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveManual} className="space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Lesson Plan Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Science Lesson Plan: Cells Structure"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>

                  {/* Core configuration selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                        required
                      >
                        <option value="">Select class...</option>
                        {classesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        disabled={!classId}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer disabled:opacity-40"
                        required
                      >
                        {!classId ? (
                          <option value="">Select a class first...</option>
                        ) : (
                          subjectsList.map((subj, idx) => (
                            <option key={idx} value={subj}>
                              {subj}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Duration (Minutes)
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                      >
                        <option value="30">30 Mins</option>
                        <option value="40">40 Mins</option>
                        <option value="45">45 Mins</option>
                        <option value="60">60 Mins</option>
                      </select>
                    </div>
                  </div>

                  {/* Objectives */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Learning Objectives <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={manualObjectives}
                      onChange={(e) => setManualObjectives(e.target.value)}
                      placeholder="Objectives here (separated by newlines)..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>

                  {/* Warm Up and Main Teaching */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Warm Up Activity
                      </label>
                      <textarea
                        value={manualWarmUp}
                        onChange={(e) => setManualWarmUp(e.target.value)}
                        placeholder="Hook student interest (e.g. 5-10 mins overview)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Main Teaching Points
                      </label>
                      <textarea
                        value={manualMainTeaching}
                        onChange={(e) => setManualMainTeaching(e.target.value)}
                        placeholder="Direct explanation, formulas, guidelines (e.g. 20 mins)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  {/* Activity and Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Student Activity
                      </label>
                      <textarea
                        value={manualActivity}
                        onChange={(e) => setManualActivity(e.target.value)}
                        placeholder="Exercises, worksheets, pair activities (e.g. 10 mins)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Summary & Homework
                      </label>
                      <textarea
                        value={manualSummary}
                        onChange={(e) => setManualSummary(e.target.value)}
                        placeholder="Review question recaps and homework pages (e.g. 5 mins)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  {/* Resources and Assessment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Resources Needed
                      </label>
                      <textarea
                        value={manualResources}
                        onChange={(e) => setManualResources(e.target.value)}
                        placeholder="Materials, markers, notebooks (one per line)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Assessment Method
                      </label>
                      <textarea
                        value={manualAssessment}
                        onChange={(e) => setManualAssessment(e.target.value)}
                        placeholder="Describe evaluation (e.g. quiz, collect notebook sheets)..."
                        rows={3}
                        className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => router.push("/teacher/lessons")}
                      className="inline-flex items-center justify-center text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Save Lesson Plan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Generated output section */}
      {generatedPlan && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <h2 className="text-lg font-bold text-white print:hidden flex items-center gap-2">
            <FileText className="size-5 text-purple-400" />
            Generated Lesson Plan Output
          </h2>

          {/* Premium Lesson Plan Card - Printable */}
          <div className="bg-gray-950 border-2 border-purple-500/30 text-white rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
            {/* Header banner */}
            <div className="border-b border-white/[0.06] pb-4 flex flex-col md:flex-row md:justify-between md:items-start gap-4 print:border-black print:pb-2">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-white print:text-black flex items-center gap-2">
                  <span>📚</span> Lesson Plan: {topic}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs md:text-sm text-gray-400 print:text-black">
                  <span className="bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-md font-semibold border border-purple-500/20 print:border-none print:bg-transparent print:p-0">
                    {classesList.find((c) => c.id === classId)?.name || "Class"}
                  </span>
                  <span className="text-gray-600 print:text-black">•</span>
                  <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-md font-semibold border border-indigo-500/20 print:border-none print:bg-transparent print:p-0">
                    {subjectName}
                  </span>
                  <span className="text-gray-600 print:text-black">•</span>
                  <span className="bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-md font-semibold border border-gray-700 print:border-none print:bg-transparent print:p-0">
                    {duration} Minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Content body split */}
            <div className="space-y-6">
              {/* Objectives */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">
                  🎯 LEARNING OBJECTIVES
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-sm text-gray-300 print:text-black print:pl-4">
                  {generatedPlan.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              <hr className="border-white/[0.05] print:border-black" />

              {/* Lesson breakdown timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">
                  ⏱️ LESSON BREAKDOWN
                </h4>
                <div className="space-y-4">
                  {generatedPlan.breakdown.map((item, i) => (
                    <div
                      key={i}
                      className="border border-white/[0.05] bg-white/[0.01] p-4 rounded-xl space-y-1.5 print:border-black print:bg-transparent print:p-2"
                    >
                      <div className="flex justify-between items-center text-sm print:text-black">
                        <strong className="text-white font-bold print:text-black">
                          {item.title}
                        </strong>
                        <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full print:text-black print:border-none print:bg-transparent">
                          {item.duration} mins
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed print:text-black whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-white/[0.05] print:border-black" />

              {/* Resources & Assessment row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">
                    📌 RESOURCES NEEDED
                  </h4>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-gray-300 print:text-black print:pl-4">
                    {generatedPlan.resources.map((res, i) => (
                      <li key={i}>{res}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">
                    🎯 ASSESSMENT
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed print:text-black">
                    {generatedPlan.assessment}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons below generated card */}
          <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
            <button
              onClick={handleSwitchToManualEdit}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <Edit className="size-4" />
              Edit Manually
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <Printer className="size-4" />
              Export PDF
            </button>

            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-400 hover:bg-purple-500/15 hover:text-purple-300 transition-colors"
            >
              <RefreshCw className="size-4" />
              Regenerate
            </button>

            <button
              onClick={handleSaveAIGenerated}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-purple-600/20 disabled:opacity-50 transition-colors shadow-lg shadow-purple-500/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Lesson Plan
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
