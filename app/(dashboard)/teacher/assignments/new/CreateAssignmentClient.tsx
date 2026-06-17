"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Save,
  CheckCircle,
  UploadCloud,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ClassSubjectItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface CreateAssignmentClientProps {
  classSubjects: ClassSubjectItem[];
}

export default function CreateAssignmentClient({
  classSubjects,
}: CreateAssignmentClientProps) {
  const router = useRouter();

  // Distinct classes list
  const classesMap = new Map<string, string>();
  classSubjects.forEach((item) => {
    classesMap.set(item.classId, item.className);
  });
  const classesList = Array.from(classesMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // State variables
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("10");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filtered subjects based on classId
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>([]);

  // Update subject list when classId changes
  useEffect(() => {
    if (!classId) {
      setSubjectsList([]);
      setSubjectId("");
      return;
    }

    const filtered = classSubjects
      .filter((item) => item.classId === classId)
      .map((item) => ({ id: item.subjectId, name: item.subjectName }));

    // Remove duplicates if any
    const uniqueMap = new Map<string, string>();
    filtered.forEach((sub) => uniqueMap.set(sub.id, sub.name));
    const uniqueSubjects = Array.from(uniqueMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    setSubjectsList(uniqueSubjects);

    // Auto-select first subject if list is not empty
    if (uniqueSubjects.length > 0) {
      setSubjectId(uniqueSubjects[0].id);
    } else {
      setSubjectId("");
    }
  }, [classId, classSubjects]);

  // Mock Upload Handler
  const handleMockUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const mockUrl = "/attachments/assignment_template_" + Math.random().toString(36).substring(7) + ".pdf";
      setAttachmentUrl(mockUrl);
      toast.success("Attachment simulated and uploaded successfully!");
    }, 1200);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !classId || !subjectId || !dueDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          classId,
          subjectId,
          dueDate,
          totalMarks,
          attachmentUrl,
          isActive,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create assignment");
      }

      toast.success("Assignment created! Notifications sent to students/parents.");
      router.push("/teacher/assignments");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while creating the assignment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/teacher/assignments")}
          className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Create Assignment
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">New Assignment Wizard</h1>
        </div>
      </div>

      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardHeader className="border-b border-white/[0.05] pb-4">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList className="size-4 text-blue-400" />
            Assignment Specifications
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algebra Basics Homework"
                className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Instructions / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe assignment tasks, page numbers, or guidelines..."
                rows={4}
                className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 resize-y"
              />
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Target Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
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

              {/* Subject Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  required
                >
                  {!classId ? (
                    <option value="">Select a class first...</option>
                  ) : (
                    subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date + Marks row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Due Date & Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 [color-scheme:dark] cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Total Marks */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total Marks
                </label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  min={1}
                  className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>
            </div>

            {/* Attachment File Simulator */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Attachment (Mock Upload)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleMockUpload}
                  disabled={isUploading || isSaving}
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white disabled:opacity-50 transition-all shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  Select File (PDF, DOCX, Image)
                </button>
                {attachmentUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl truncate">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate max-w-[200px]">{attachmentUrl.split("/").pop()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-white/[0.08] bg-black/40 text-blue-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-xs font-semibold text-gray-300 cursor-pointer">
                Publish assignment immediately (visible to students)
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/teacher/assignments")}
                className="inline-flex items-center justify-center text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 border border-blue-600/20 disabled:opacity-45 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save & Publish
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
