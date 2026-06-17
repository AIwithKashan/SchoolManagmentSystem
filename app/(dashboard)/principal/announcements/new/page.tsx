"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Megaphone,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  Bold,
  Italic,
  Underline,
  List,
  Link2,
  Code,
  Users,
  Eye,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

export default function NewAnnouncementPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- States ---
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState<"ALL" | "TEACHERS" | "PARENTS" | "CLASS">("ALL");
  const [classId, setClassId] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // --- Load Classes ---
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true);
        const res = await fetch("/api/principal/classes");
        const data = await res.json();
        if (res.ok && data.classes) {
          setClasses(data.classes);
        }
      } catch (err) {
        console.error("Error loading classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  // --- Rich Text Editor Helper ---
  const insertFormatting = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;

    setContent(text.substring(0, start) + replacement + text.substring(end));
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // --- Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an announcement title");
      return;
    }
    if (title.length > 100) {
      toast.error("Title must be less than 100 characters");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter some announcement content");
      return;
    }
    if (targetAudience === "CLASS" && !classId) {
      toast.error("Please select a target class");
      return;
    }
    if (scheduleForLater && !scheduledAt) {
      toast.error("Please specify a date and time to schedule this notice");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        targetAudience,
        classId: targetAudience === "CLASS" ? classId : null,
        scheduledAt: scheduleForLater ? new Date(scheduledAt).toISOString() : null,
        isActive,
      };

      const res = await fetch("/api/principal/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create announcement");
      }

      toast.success("Announcement successfully broadcasted! 📢");
      router.push("/principal/announcements");
    } catch (err: any) {
      toast.error(err.message || "An error occurred while creating the announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header and Back Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/principal/announcements">
            <Button
              variant="outline"
              size="icon"
              className="border-gray-800 bg-slate-900/40 text-gray-400 hover:text-white size-9"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Megaphone className="size-6 text-purple-400" />
              New Announcement
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Compose a new broadcast message and dispatch notifications instantly.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
          className="border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-800 text-xs gap-1.5 h-9"
        >
          <Eye className="size-4" />
          {previewMode ? "Edit Composer" : "Preview Notice"}
        </Button>
      </div>

      {previewMode ? (
        /* Preview Card */
        <Card className="glass-card border-gray-800/80 bg-slate-900/30 overflow-hidden shadow-xl animate-in fade-in duration-200">
          <div className="p-6 border-b border-gray-800/50 bg-slate-950/20">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Audience: {targetAudience === "CLASS" ? "Specific Class" : targetAudience}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                <Calendar className="size-3" />
                {scheduleForLater && scheduledAt
                  ? `Scheduled: ${new Date(scheduledAt).toLocaleString()}`
                  : "Post Instantly"}
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mt-3 leading-snug">
              {title || "Untitled Announcement"}
            </h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed min-h-[150px]">
              {content || "No body content written yet. Switch back to edit composer to add some body text."}
            </div>
            
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-slate-800 border border-gray-700 flex items-center justify-center font-bold text-[8px] text-gray-400 uppercase">
                  P
                </div>
                <span>Principal (You)</span>
              </div>
              <span className="font-semibold">{isActive ? "🟢 Active Notice" : "🟡 Draft Mode"}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Form Card */
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glass-card border-gray-800/80 bg-slate-900/30 shadow-xl p-6 space-y-6">
            
            {/* Title Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="title" className="text-xs font-bold text-gray-350 uppercase tracking-wider">
                  Announcement Title <span className="text-red-500">*</span>
                </Label>
                <span className={cn("text-[10px] font-semibold", title.length > 100 ? "text-red-400 font-bold" : "text-gray-500")}>
                  {title.length}/100 chars
                </span>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Important: Parent-Teacher Meeting Schedule Change..."
                maxLength={100}
                required
                className="bg-slate-950/60 border-gray-800 text-gray-100 placeholder:text-gray-600 focus-visible:ring-purple-500 h-11 text-sm"
              />
            </div>

            {/* Custom Rich Textarea */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-xs font-bold text-gray-350 uppercase tracking-wider block">
                Message Body <span className="text-red-500">*</span>
              </Label>
              <div className="rounded-lg border border-gray-850 overflow-hidden bg-slate-950/40">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-850 bg-slate-950/80 text-gray-400">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("**", "**")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Bold"
                  >
                    <Bold className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("*", "*")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Italic"
                  >
                    <Italic className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("__", "__")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Underline"
                  >
                    <Underline className="size-3.5" />
                  </Button>
                  <div className="w-px h-4 bg-gray-800 mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("- ", "")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Bullet List"
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("[", "](https://)")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Insert Link"
                  >
                    <Link2 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => insertFormatting("`", "`")}
                    className="size-7 p-0 hover:bg-slate-800 hover:text-white"
                    title="Code Snippet"
                  >
                    <Code className="size-3.5" />
                  </Button>
                </div>
                {/* Textarea Area */}
                <textarea
                  id="content"
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement details here. You can use basic markdown elements for structuring lists or emphasizing text..."
                  rows={8}
                  required
                  className="w-full bg-transparent px-3 py-3 text-xs text-gray-250 placeholder:text-gray-600 focus:outline-none resize-y outline-none leading-relaxed min-h-[160px]"
                ></textarea>
              </div>
            </div>

            {/* Target Audience and Class Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audience" className="text-xs font-bold text-gray-350 uppercase tracking-wider block">
                  Target Audience
                </Label>
                <div className="relative">
                  <select
                    id="audience"
                    value={targetAudience}
                    onChange={(e) => {
                      const aud = e.target.value as any;
                      setTargetAudience(aud);
                      if (aud !== "CLASS") setClassId("");
                    }}
                    className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none h-11 appearance-none pr-8 cursor-pointer focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="ALL">All (Everyone)</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="CLASS">Specific Class...</option>
                  </select>
                  <Users className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Class Filter if Target Audience is specific class */}
              <div className={cn("space-y-2 transition-all duration-200", targetAudience === "CLASS" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none")}>
                <Label htmlFor="class-target" className="text-xs font-bold text-gray-350 uppercase tracking-wider block">
                  Select Class
                </Label>
                <div className="relative">
                  {loadingClasses ? (
                    <div className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-500 h-11 flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin text-purple-400" />
                      Loading class listings...
                    </div>
                  ) : (
                    <>
                      <select
                        id="class-target"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        disabled={targetAudience !== "CLASS"}
                        className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-250 outline-none h-11 appearance-none pr-8 cursor-pointer focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                      >
                        <option value="">Select a class...</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.displayName}
                          </option>
                        ))}
                      </select>
                      <Users className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule picker & Publication state Toggle */}
            <div className="border-t border-gray-800/60 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Schedule For Later */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-850 bg-slate-950/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="schedule" className="text-xs font-bold text-gray-250 uppercase tracking-wider block">
                      Schedule For Later
                    </Label>
                    <p className="text-[10px] text-gray-500">Hold announcement publication until specific time.</p>
                  </div>
                  <Switch
                    id="schedule"
                    checked={scheduleForLater}
                    onCheckedChange={(checked) => {
                      setScheduleForLater(checked);
                      if (!checked) setScheduledAt("");
                    }}
                    className="data-[state=checked]:bg-purple-600 scale-90 border-gray-800"
                  />
                </div>

                {scheduleForLater && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="scheduled-time" className="text-xs font-bold text-gray-400 block">
                      Posting Date & Time
                    </Label>
                    <div className="relative">
                      <Input
                        id="scheduled-time"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required={scheduleForLater}
                        className="bg-slate-950/60 border-gray-800 text-gray-200 focus-visible:ring-purple-500 h-10 text-xs pl-10 cursor-pointer scheme-dark"
                      />
                      <Calendar className="absolute left-3 top-3 size-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-850 bg-slate-950/20 h-fit self-start">
                <div className="space-y-0.5">
                  <Label htmlFor="active-notice" className="text-xs font-bold text-gray-250 uppercase tracking-wider block">
                    Is Active / Publish Immediately
                  </Label>
                  <p className="text-[10px] text-gray-500">If disabled, the bulletin will save as a silent draft.</p>
                </div>
                <Switch
                  id="active-notice"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-emerald-600 scale-90 border-gray-800"
                />
              </div>

            </div>

          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/principal/announcements">
              <Button
                type="button"
                variant="outline"
                className="border-gray-800 bg-slate-900/40 text-gray-400 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center gap-1.5 px-6 h-10"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Publish Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
