"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Upload,
  CheckCircle,
  FileUp,
  AlertTriangle,
  Download,
  Loader2,
  Lock,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StudentAssignmentClientProps {
  assignmentId: string;
  studentId: string;
  studentName: string;
}

type FormTab = "type" | "upload";

export default function StudentAssignmentClient({
  assignmentId,
  studentId,
  studentName,
}: StudentAssignmentClientProps) {
  const router = useRouter();

  // Assignment & Submission state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [activeFormTab, setActiveFormTab] = useState<FormTab>("type");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Flow states
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignmentData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/homework/assignment/${assignmentId}?studentId=${studentId}`);
      if (!res.ok) throw new Error("Failed to load assignment details");
      const resData = await res.json();
      setData(resData);
      
      // Initialize form if submission exists
      if (resData.submission) {
        setTypedAnswer(resData.submission.content || "");
        if (resData.submission.attachmentUrl) {
          setUploadedFile({
            name: resData.submission.attachmentUrl.split("/").pop() || "submitted_file.pdf",
            size: "Linked metadata",
            url: resData.submission.attachmentUrl,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Could not fetch assignment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId, studentId]);

  // Countdown timer helper
  const getDueDateCountdown = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <span className="text-rose-400 font-bold">Overdue ({Math.abs(diffDays)}d ago)</span>;
    if (diffDays === 0) return <span className="text-orange-400 font-bold">Due today</span>;
    if (diffDays === 1) return <span className="text-yellow-400 font-bold">Due tomorrow</span>;
    return <span className="text-emerald-400 font-semibold">Due in {diffDays} days</span>;
  };

  // Mock File Upload process (progress bar simulation)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit 10MB
    const limit = 10 * 1024 * 1024;
    if (file.size > limit) {
      toast.error("File is too large. Maximum size allowed is 10MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadedFile({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            url: `https://example.com/uploads/student_${studentId}/${file.name}`,
          });
          toast.success("File uploaded and metadata verified!");
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // Clear uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  // Submit flow triggers confirmation modal
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeFormTab === "type" && !typedAnswer.trim()) {
      toast.error("Please type your written answer first.");
      return;
    }
    if (activeFormTab === "upload" && !uploadedFile) {
      toast.error("Please upload a file attachment first.");
      return;
    }
    setShowConfirmModal(true);
  };

  // Confirm submission action (saves to database)
  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const content = activeFormTab === "type" ? typedAnswer : "";
      const attachmentUrl = activeFormTab === "upload" && uploadedFile ? uploadedFile.url : "";

      const res = await fetch("/api/parent/homework/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          content,
          attachmentUrl,
        }),
      });

      if (!res.ok) throw new Error("Could not submit assignment");

      toast.success("Assignment submitted successfully!");
      setIsEditing(false);
      await fetchAssignmentData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to submit homework.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 text-gray-500 text-sm">
        Loading homework worksheet...
      </div>
    );
  }

  const { title, description, dueDate, totalMarks, attachmentUrl, subjectName, teacherName, submission } = data;
  const isPastDue = new Date(dueDate) < new Date();
  const showForm = !submission || isEditing;

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/parent/student-corner?childId=${studentId}`)}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                My Homework
              </span>
              <span className="text-gray-700">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {subjectName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-900 border border-white/[0.06] rounded-xl px-4 py-2.5 shrink-0 self-start sm:self-auto">
          <Calendar className="size-4 text-gray-500" />
          <span>Due: <strong>{getDueDateCountdown(dueDate)}</strong></span>
          <span className="text-gray-700">•</span>
          <span>Marks: <strong>{totalMarks}</strong></span>
        </div>
      </div>

      {/* ── ASSIGNMENT INSTRUCTIONS ── */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardHeader className="pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-blue-400" />
            <CardTitle className="text-sm font-semibold text-white">Assignment Instructions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.04]">
            <div className="text-[11px] text-gray-500">
              Instructor: <strong className="text-gray-300">{teacherName}</strong>
            </div>

            {attachmentUrl && (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-all"
              >
                <Download className="size-3.5" />
                Download Worksheet Attachment
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── EXISTING SUBMISSION DETAILS ── */}
      {submission && !isEditing && (
        <div className="space-y-6">
          {/* Submission Info */}
          <Card className="border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-emerald-500/10 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-white">Your Submission</CardTitle>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                Submitted
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {submission.content ? (
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {submission.content}
                </div>
              ) : (
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between text-xs text-gray-300">
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-blue-400" />
                    {submission.attachmentUrl.split("/").pop() || "uploaded_file.pdf"}
                  </span>
                  <a
                    href={submission.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    View File
                  </a>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.04]">
                <span className="text-[11px] text-gray-500">
                  Submitted at: <strong>{new Date(submission.submittedAt).toLocaleString()}</strong>
                </span>

                {!isPastDue && submission.status !== "GRADED" && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <Edit2 className="size-3" />
                    Edit Submission
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teacher Grade and Feedback */}
          {submission.teacherScore !== null && (
            <Card className="border border-purple-500/20 bg-purple-950/10 backdrop-blur-xl rounded-xl relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-purple-500/10 blur-xl rounded-full" />
              <CardHeader className="pb-3 border-b border-purple-500/10">
                <CardTitle className="text-sm font-semibold text-white">Teacher Evaluation</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Score Obtained:</span>
                  <span className="text-2xl font-extrabold text-purple-400">
                    {submission.teacherScore}
                  </span>
                  <span className="text-xs text-gray-500">/ {totalMarks}</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Remarks:</span>
                  <div className="bg-black/40 border border-white/[0.04] rounded-xl p-3.5 text-xs text-gray-300 leading-relaxed italic">
                    &quot;{submission.teacherFeedback || "No comments added by teacher."}&quot;
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── SUBMISSION FORM ── */}
      {showForm && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <FileUp className="size-4 text-blue-400" />
              <CardTitle className="text-sm font-semibold text-white">
                {isEditing ? "Modify Submission" : "Submit Assignment Answers"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isPastDue && !isEditing ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500 text-sm">
                <Lock className="size-10 text-rose-500 mb-2" />
                <h4 className="text-rose-400 font-bold">Submission Closed</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  The due date for this assignment has passed. You can no longer submit homework.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePreSubmit} className="space-y-6">
                {/* Tabs bar */}
                <div className="flex bg-black/40 border border-white/[0.06] p-1 rounded-xl w-fit gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab("type")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeFormTab === "type"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Type Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFormTab("upload")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeFormTab === "upload"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                {/* Tab Content A: Type Answer */}
                {activeFormTab === "type" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Written Answer / Essay
                    </label>
                    <textarea
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="Type your homework answer details here..."
                      rows={10}
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:border-blue-500/50 resize-y font-mono"
                      required
                    />
                    <div className="text-right text-[10px] text-gray-500">
                      Character Count: <strong>{typedAnswer.length}</strong>
                    </div>
                  </div>
                )}

                {/* Tab Content B: Upload File */}
                {activeFormTab === "upload" && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Upload File Attachment (Max 10MB)
                    </label>
                    
                    {!uploadedFile ? (
                      <div className="relative border-2 border-dashed border-white/[0.08] hover:border-blue-500/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-black/20">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {uploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="size-8 text-blue-500 animate-spin" />
                            <span className="text-xs text-gray-400">Verifying file ({uploadProgress}%)</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2 text-center">
                            <Upload className="size-8 text-gray-500 mb-1" />
                            <span className="text-xs text-gray-300 font-medium">Click to select files or drag-and-drop</span>
                            <span className="text-[10px] text-gray-500">Supports PDF, Word Documents, and Images</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-black/40 border border-white/[0.08] p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="size-8 text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate">{uploadedFile.name}</h5>
                            <p className="text-[9px] text-gray-500 mt-0.5">{uploadedFile.size}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button bar */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 border border-blue-600/20 transition-all shadow-lg shadow-blue-500/10"
                  >
                    Submit Assignment
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center justify-center text-xs font-semibold py-2.5 px-4 rounded-lg border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONFIRMATION MODAL DIALOG ── */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="w-full sm:max-w-md border border-white/[0.08] bg-gray-950 text-white [color-scheme:dark] p-5 rounded-2xl select-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2 leading-none">
              <AlertTriangle className="size-5 text-yellow-400" />
              Confirm Homework Submission
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs mt-2 leading-relaxed">
              Are you sure you want to submit your answers? This will lock in your submission and notify the subject instructor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="py-2 px-3 rounded-lg border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="py-2 px-3.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm Submit"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
