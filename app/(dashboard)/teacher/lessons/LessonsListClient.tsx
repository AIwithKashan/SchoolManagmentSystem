"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  Copy,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface LessonPlanContent {
  objectives: string[];
  breakdown: Array<{ title: string; duration: number; description: string }>;
  resources: string[];
  assessment: string;
}

interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  classId: string;
  className: string;
  topic: string;
  duration: number;
  content: LessonPlanContent;
  isAIGenerated: boolean;
  createdAt: string;
}

interface LessonsListClientProps {
  initialLessons: LessonPlan[];
}

export default function LessonsListClient({ initialLessons }: LessonsListClientProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonPlan[]>(initialLessons);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  // Filter lessons
  const filteredLessons = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson plan? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/teacher/lessons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete lesson plan");

      setLessons((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lesson plan deleted successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not delete lesson plan.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Duplicate handler
  const handleDuplicate = async (lesson: LessonPlan) => {
    setIsDuplicating(lesson.id);
    try {
      const duplicatedTitle = `${lesson.title} (Copy)`;
      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: duplicatedTitle,
          classId: lesson.classId,
          subject: lesson.subject,
          topic: lesson.topic,
          duration: lesson.duration,
          content: lesson.content,
          isAIGenerated: lesson.isAIGenerated,
        }),
      });

      if (!res.ok) throw new Error("Failed to duplicate lesson plan");

      const newLesson = await res.json();
      // Add class name back for the local state display
      const enrichedNewLesson = {
        ...newLesson,
        className: lesson.className,
      };

      setLessons((prev) => [enrichedNewLesson, ...prev]);
      toast.success("Lesson plan duplicated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not duplicate lesson plan.");
    } finally {
      setIsDuplicating(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section with Create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Lesson Planner</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate and manage premium lesson plans using Afia AI.
          </p>
        </div>
        <Link
          href="/teacher/lessons/new"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 shrink-0"
        >
          <Plus className="size-4" />
          Create New Lesson Plan
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, subject, topic or class..."
          className="w-full bg-gray-900/40 border border-white/[0.08] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {/* Grid List */}
      {filteredLessons.length === 0 ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-12 text-center rounded-2xl">
          <BookOpen className="size-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-gray-300 font-bold text-lg">No Lesson Plans Found</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            {searchQuery
              ? "No lesson plans match your current search query. Try clearing your filters or using a different keyword."
              : "Get started by generating your first lesson plan. Click the 'Create New Lesson Plan' button to design one using AI."}
          </p>
          {!searchQuery && (
            <Link
              href="/teacher/lessons/new"
              className="mt-6 inline-flex items-center justify-center gap-2 bg-purple-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-purple-500 transition-colors"
            >
              <Plus className="size-3.5" />
              Generate First Lesson Plan
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="relative overflow-hidden border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-2xl hover:border-white/[0.12] hover:bg-gray-900/80 transition-all group flex flex-col justify-between"
            >
              {/* Highlight bar for AI vs manual */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  lesson.isAIGenerated
                    ? "from-purple-500 to-indigo-500"
                    : "from-blue-500 to-cyan-500"
                }`}
              />

              <div className="p-5 space-y-4">
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-purple-400 transition-colors truncate">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">Topic: {lesson.topic}</p>
                  </div>
                  {lesson.isAIGenerated && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      <Sparkles className="size-2.5" />
                      AI
                    </span>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded truncate">
                      {lesson.className}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 justify-end">
                    <span className="font-semibold text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded truncate">
                      {lesson.subject}
                    </span>
                  </div>
                </div>

                {/* Date & Duration Info */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-gray-500" />
                    <span>{lesson.duration} Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-gray-500" />
                    <span>{formatDate(lesson.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-1.5">
                <button
                  onClick={() => setSelectedLesson(lesson)}
                  className="inline-flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Eye className="size-3.5" />
                  View
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(lesson)}
                    disabled={isDuplicating === lesson.id}
                    className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                    title="Duplicate Lesson Plan"
                  >
                    <Copy className="size-3.5" />
                  </button>

                  {/* Edit */}
                  <Link
                    href={`/teacher/lessons/edit/${lesson.id}`}
                    className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Edit Lesson Plan"
                  >
                    <Edit className="size-3.5" />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    disabled={isDeleting === lesson.id}
                    className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50 transition-colors"
                    title="Delete Lesson Plan"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      {selectedLesson && (
        <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
          <DialogContent className="max-w-3xl border border-white/[0.1] bg-gray-950 text-white rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-white/[0.06] pb-4 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="size-5 text-purple-400" />
                  {selectedLesson.title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span className="bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded">
                    {selectedLesson.className}
                  </span>
                  <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded">
                    {selectedLesson.subject}
                  </span>
                  <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                    {selectedLesson.duration} Minutes
                  </span>
                  {selectedLesson.isAIGenerated && (
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                      <Sparkles className="size-3" />
                      AI Generated
                    </span>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Objectives */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-purple-400">🎯</span> Learning Objectives
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-sm text-gray-300">
                  {selectedLesson.content.objectives?.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Lesson Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-purple-400">⏱️</span> Lesson Breakdown
                </h4>
                <div className="space-y-4">
                  {selectedLesson.content.breakdown?.map((item, i) => (
                    <div
                      key={i}
                      className="border border-white/[0.05] bg-white/[0.02] p-4 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <strong className="text-white font-semibold">{item.title}</strong>
                        <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          {item.duration} mins
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-purple-400">📌</span> Resources Needed
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-sm text-gray-300">
                  {selectedLesson.content.resources?.map((res, i) => (
                    <li key={i}>{res}</li>
                  ))}
                </ul>
              </div>

              {/* Assessment */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-purple-400">📝</span> Assessment & Evaluations
                </h4>
                <p className="text-sm text-gray-300 bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-xl whitespace-pre-line leading-relaxed">
                  {selectedLesson.content.assessment}
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="border-t border-white/[0.06] pt-4 mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-xs font-semibold py-2 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white transition-colors"
              >
                Close Plan
              </button>
              <Link
                href={`/teacher/lessons/edit/${selectedLesson.id}`}
                className="text-xs font-semibold py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Edit Lesson Plan
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
