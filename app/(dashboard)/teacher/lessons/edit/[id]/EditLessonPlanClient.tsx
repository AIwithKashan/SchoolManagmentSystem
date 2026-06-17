"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface LessonBreakdownItem {
  title: string;
  duration: number;
  description: string;
}

interface LessonPlanContent {
  objectives: string[];
  breakdown: LessonBreakdownItem[];
  resources: string[];
  assessment: string;
}

interface LessonPlanData {
  id: string;
  title: string;
  subject: string;
  classId: string;
  topic: string;
  duration: string;
  content: LessonPlanContent;
  isAIGenerated: boolean;
}

interface ClassSubjectItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface EditLessonPlanClientProps {
  lessonPlan: LessonPlanData;
  classSubjects: ClassSubjectItem[];
}

export default function EditLessonPlanClient({
  lessonPlan,
  classSubjects,
}: EditLessonPlanClientProps) {
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

  // Initializing state fields
  const [title, setTitle] = useState(lessonPlan.title);
  const [topic, setTopic] = useState(lessonPlan.topic);
  const [duration, setDuration] = useState(lessonPlan.duration);
  const [isSaving, setIsSaving] = useState(false);

  // Objectives (joined as text lines)
  const [objectives, setObjectives] = useState(
    lessonPlan.content.objectives?.join("\n") || ""
  );

  // Parse breakdown segments
  const warmUpItem = lessonPlan.content.breakdown?.find((b) =>
    b.title.toLowerCase().includes("warm")
  );
  const mainItem = lessonPlan.content.breakdown?.find(
    (b) =>
      b.title.toLowerCase().includes("main") ||
      b.title.toLowerCase().includes("teach")
  );
  const activityItem = lessonPlan.content.breakdown?.find(
    (b) =>
      b.title.toLowerCase().includes("activity") ||
      b.title.toLowerCase().includes("experiment")
  );
  const summaryItem = lessonPlan.content.breakdown?.find(
    (b) =>
      b.title.toLowerCase().includes("summary") ||
      b.title.toLowerCase().includes("wrap")
  );

  const [warmUp, setWarmUp] = useState(warmUpItem?.description || "");
  const [mainTeaching, setMainTeaching] = useState(mainItem?.description || "");
  const [activity, setActivity] = useState(activityItem?.description || "");
  const [summary, setSummary] = useState(summaryItem?.description || "");

  // Resources (joined as text lines)
  const [resources, setResources] = useState(
    lessonPlan.content.resources?.join("\n") || ""
  );
  const [assessment, setAssessment] = useState(
    lessonPlan.content.assessment || ""
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !objectives) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedContent: LessonPlanContent = {
        objectives: objectives.split("\n").filter((o) => o.trim().length > 0),
        breakdown: [
          {
            title: "Warm Up",
            duration: Math.round(parseInt(duration) * 0.15),
            description: warmUp,
          },
          {
            title: "Main Teaching",
            duration: Math.round(parseInt(duration) * 0.5),
            description: mainTeaching,
          },
          {
            title: "Student Activity",
            duration: Math.round(parseInt(duration) * 0.25),
            description: activity,
          },
          {
            title: "Summary & Homework",
            duration: Math.round(parseInt(duration) * 0.1),
            description: summary,
          },
        ],
        resources: resources.split("\n").filter((r) => r.trim().length > 0),
        assessment,
      };

      const res = await fetch(`/api/teacher/lessons/${lessonPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          duration,
          content: updatedContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to update lesson plan");

      toast.success("Lesson plan updated successfully!");
      router.push("/teacher/lessons");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Could not update lesson plan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/teacher/lessons")}
          className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Edit Lesson Plan
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            Modify Lesson Details
          </h1>
        </div>
      </div>

      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Edit className="size-4 text-purple-400" />
            Lesson Plan Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Lesson Plan Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science Lesson Plan: Cells Structure"
                className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                required
              />
            </div>

            {/* Read only details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Target Class
                </label>
                <input
                  type="text"
                  value={
                    classesList.find((c) => c.id === lessonPlan.classId)?.name ||
                    "Class"
                  }
                  disabled
                  className="w-full bg-black/20 border border-white/[0.04] text-gray-500 text-sm rounded-xl px-4 py-2.5 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  value={lessonPlan.subject}
                  disabled
                  className="w-full bg-black/20 border border-white/[0.04] text-gray-500 text-sm rounded-xl px-4 py-2.5 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Duration (Minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="30">30 Mins</option>
                  <option value="40">40 Mins</option>
                  <option value="45">45 Mins</option>
                  <option value="60">60 Mins</option>
                </select>
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Topic / Chapter Name
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Learning Objectives</span>
                <span className="text-[10px] text-gray-500">One per line</span>
              </label>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Objectives here..."
                rows={4}
                className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                required
              />
            </div>

            {/* Warm up & Main Teaching */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Warm Up Activity
                </label>
                <textarea
                  value={warmUp}
                  onChange={(e) => setWarmUp(e.target.value)}
                  placeholder="Describe warm up activities..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Main Teaching Points
                </label>
                <textarea
                  value={mainTeaching}
                  onChange={(e) => setMainTeaching(e.target.value)}
                  placeholder="Describe main instruction contents..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Student Activity & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Student Activity
                </label>
                <textarea
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Describe student activities..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Summary & Homework
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe homework and wrap-up details..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Resources and Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Resources Needed</span>
                  <span className="text-[10px] text-gray-500">One per line</span>
                </label>
                <textarea
                  value={resources}
                  onChange={(e) => setResources(e.target.value)}
                  placeholder="Materials needed..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Assessment Method
                </label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder="Assessments and tests details..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Action buttons */}
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
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-purple-600/20 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
