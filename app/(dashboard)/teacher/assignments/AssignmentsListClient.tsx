"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  BookOpen,
  ClipboardList,
  Edit,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  attachmentUrl: string | null;
  isActive: boolean;
  className: string;
  classId: string;
  subjectName: string;
  studentCount: number;
  submissionCount: number;
  gradedCount: number;
}

interface AssignmentsListClientProps {
  initialAssignments: Assignment[];
}

type TabType = "ACTIVE" | "PASTDUE" | "ALL";

export default function AssignmentsListClient({
  initialAssignments,
}: AssignmentsListClientProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = new Date();

  // Filter assignments based on activeTab
  const getFilteredAssignments = () => {
    return assignments.filter((assign) => {
      const isPastDue = new Date(assign.dueDate) < now;
      if (activeTab === "ACTIVE") return !isPastDue;
      if (activeTab === "PASTDUE") return isPastDue;
      return true;
    });
  };

  const filtered = getFilteredAssignments();

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment and all of its student submissions? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/teacher/assignments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete assignment");

      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Assignment deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not delete assignment.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-PK", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Tabs selector */}
      <div className="flex border-b border-white/[0.06] gap-6">
        {(["ALL", "ACTIVE", "PASTDUE"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
              activeTab === tab
                ? "text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "ALL" && "All Assignments"}
            {tab === "ACTIVE" && "Active"}
            {tab === "PASTDUE" && "Past Due"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Assignments Yet"
          description="Create your first assignment for this class"
          actionLabel="Create Assignment"
          onAction={() => router.push("/teacher/assignments/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((assign) => {
            const isPastDue = new Date(assign.dueDate) < now;
            
            // Submission percentage rate
            const submitPct =
              assign.studentCount > 0
                ? Math.round((assign.submissionCount / assign.studentCount) * 100)
                : 0;

            return (
              <Card
                key={assign.id}
                className="relative overflow-hidden border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl hover:border-white/[0.1] transition-all group flex flex-col justify-between"
              >
                {/* Due status accent border */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isPastDue ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />

                <div className="p-5 space-y-4">
                  {/* Top: Title + Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 pl-1">
                      <h3 className="text-base font-bold text-white leading-tight truncate group-hover:text-blue-400 transition-colors">
                        {assign.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          {assign.className}
                        </span>
                        <span className="inline-flex items-center text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          {assign.subjectName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase leading-none">Marks</p>
                      <p className="text-lg font-bold text-white mt-1">{assign.totalMarks}</p>
                    </div>
                  </div>

                  {/* Middle: Due Date */}
                  <div className="flex items-center gap-2 pl-1">
                    <Calendar className="size-4 text-gray-500 shrink-0" />
                    <span
                      className={`text-xs font-semibold ${
                        isPastDue ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {isPastDue ? "Due date elapsed: " : "Due by: "}
                      {formatDateString(assign.dueDate)}
                    </span>
                  </div>

                  {/* Submission statistics bar */}
                  <div className="space-y-2 pl-1">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="size-3.5 text-gray-500" />
                        <strong>{assign.submissionCount}/{assign.studentCount}</strong> submitted
                      </span>
                      <span className="font-semibold">{submitPct}% rate</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          submitPct >= 80
                            ? "bg-emerald-500"
                            : submitPct >= 50
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                        style={{ width: `${submitPct}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
                      <span>Graded ratio:</span>
                      <span className="font-medium text-gray-300">
                        {assign.gradedCount}/{assign.submissionCount} graded
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom: Action buttons */}
                <div className="p-3 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-2">
                  <Link
                    href={`/teacher/assignments/${assign.id}`}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/15 transition-all group/btn"
                  >
                    View Submissions
                    <ExternalLink className="size-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/teacher/assignments/edit/${assign.id}`}
                      className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Edit assignment details"
                    >
                      <Edit className="size-3.5" />
                    </Link>

                    <button
                      onClick={() => handleDelete(assign.id)}
                      disabled={deletingId === assign.id}
                      className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50 transition-colors"
                      title="Delete assignment"
                    >
                      {deletingId === assign.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
