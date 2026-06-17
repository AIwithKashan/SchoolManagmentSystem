"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  Bot,
  CalendarRange,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  School,
  Users,
  BookOpen,
  CreditCard,
  UserPlus,
  GraduationCap,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Zod schema for school profile form ─────────────────────────────
const schoolProfileSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
  establishedYear: z
    .string()
    .regex(/^\d{4}$/, "Must be a valid year")
    .or(z.literal(""))
    .optional(),
  academicYear: z.string().min(1, "Academic year is required"),
  currentTerm: z.string().min(1, "Current term is required"),
});
type SchoolProfileForm = z.infer<typeof schoolProfileSchema>;

// ─── Types ───────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface SetupStatus {
  school: SchoolProfileForm & { id?: string; logo?: string | null } | null;
  classesCount: number;
  subjectsCount: number;
  teachersCount: number;
  studentsCount: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

// ─── AI Command Parser ───────────────────────────────────────────────
function parseUserMessage(msg: string): {
  type: "classes" | "subjects" | "fees" | "unknown";
  parsed: Record<string, unknown>;
} {
  const lower = msg.toLowerCase();

  // Classes
  if (
    lower.includes("add class") ||
    lower.includes("create class") ||
    lower.includes("section") ||
    lower.includes("grade") ||
    lower.includes("nursery") ||
    lower.includes("prep")
  ) {
    const grades: string[] = [];
    const KNOWN_GRADES = [
      "nursery",
      "prep",
      "grade 10",
      "grade 9",
      "grade 8",
      "grade 7",
      "grade 6",
      "grade 5",
      "grade 4",
      "grade 3",
      "grade 2",
      "grade 1",
    ];
    for (const g of KNOWN_GRADES) {
      if (lower.includes(g)) grades.push(g);
    }

    // Detect range: "nursery to grade 10" or "grade 1 to grade 5"
    const rangeMatch = lower.match(/(nursery|prep|grade \d+)\s+to\s+(nursery|prep|grade \d+)/);
    if (rangeMatch) {
      const allGrades = [
        "nursery",
        "prep",
        "grade 1",
        "grade 2",
        "grade 3",
        "grade 4",
        "grade 5",
        "grade 6",
        "grade 7",
        "grade 8",
        "grade 9",
        "grade 10",
      ];
      const startIdx = allGrades.indexOf(rangeMatch[1]);
      const endIdx = allGrades.indexOf(rangeMatch[2]);
      if (startIdx >= 0 && endIdx >= startIdx) {
        grades.length = 0;
        for (let i = startIdx; i <= endIdx; i++) grades.push(allGrades[i]);
      }
    }

    // Detect sections
    const sections: string[] = [];
    const sectionLetterMatch = lower.match(/\b([a-e])\s+and\s+([a-e])\b/);
    const sectionCountMatch = lower.match(/(\d+)\s+section/);
    const abcMatch = msg.match(/\b([A-E])(?:\s*,\s*[A-E])+/g);

    if (sectionLetterMatch) {
      sections.push(
        sectionLetterMatch[1].toUpperCase(),
        sectionLetterMatch[2].toUpperCase()
      );
    } else if (abcMatch) {
      const letters = abcMatch[0].split(/[\s,]+/).filter(Boolean);
      sections.push(...letters.map((l) => l.toUpperCase()));
    } else if (sectionCountMatch) {
      const count = parseInt(sectionCountMatch[1]);
      for (let i = 0; i < Math.min(count, 5); i++) {
        sections.push(String.fromCharCode(65 + i));
      }
    }

    if (sections.length === 0) sections.push("A");
    if (grades.length === 0) grades.push("nursery", "prep", "grade 1", "grade 2", "grade 3", "grade 4", "grade 5");

    return { type: "classes", parsed: { grades, sections } };
  }

  // Subjects
  if (
    lower.includes("add subject") ||
    lower.includes("subject") ||
    lower.includes("assign subject")
  ) {
    // Extract comma-separated words after keywords
    const afterKeyword =
      msg.match(/(?:subjects?|add|assign)[:\s]+([^.!?\n]+)/i)?.[1] ?? msg;
    const subjects = afterKeyword
      .split(/[,،]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40);

    return { type: "subjects", parsed: { subjects } };
  }

  // Fees
  if (
    lower.includes("fee") ||
    lower.includes("fees") ||
    lower.includes("charge") ||
    lower.includes("monthly")
  ) {
    // Extract patterns like "Nursery 3000" or "Grade 1-5 4000"
    const feeRanges: { label: string; amount: number }[] = [];
    const feePattern =
      /(?:nursery|prep|grade\s*\d+(?:\s*-\s*\d+)?)[^0-9]*(\d[\d,]+)/gi;
    let m;
    const labels: string[] = [];
    const labelsPattern =
      /(nursery|prep|grade\s*\d+(?:\s*-\s*\d+)?)/gi;
    while ((m = labelsPattern.exec(msg)) !== null) {
      labels.push(m[1]);
    }
    let amountIdx = 0;
    while ((m = feePattern.exec(msg)) !== null) {
      feeRanges.push({
        label: labels[amountIdx] ?? `Tier ${amountIdx + 1}`,
        amount: parseInt(m[1].replace(/,/g, "")),
      });
      amountIdx++;
    }

    return { type: "fees", parsed: { feeRanges } };
  }

  return { type: "unknown", parsed: {} };
}

// ─── Initial AI greeting ──────────────────────────────────────────────
const INITIAL_MESSAGE: ChatMessage = {
  id: "init",
  role: "ai",
  content: `Hello! I'm **Afia**, your AI School Assistant 🎓

I can set up your entire school in minutes! Just tell me what you need.

For example, you can say:
• *"Add classes A and B from Nursery to Grade 10"*
• *"Add subjects Math, English, Science, Urdu, Islamiat to all classes"*
• *"Set fee: Nursery 3000, Grade 1-5 4000, Grade 6-10 5500 per month"*

What would you like to set up first?`,
  timestamp: new Date(),
};

// ─── Markdown renderer (minimal) ─────────────────────────────────────
function renderMarkdown(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Italic
      line = line.replace(/\*(.+?)\*/g, "<em>$1</em>");
      // Bullet
      if (line.startsWith("• ")) {
        return (
          <li key={i} className="ml-3 list-none flex gap-1.5 items-start">
            <span className="text-purple-400 mt-0.5 shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
      );
    });
}

// ─── Tabs ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile", label: "School Profile", icon: Building2 },
  { id: "ai-setup", label: "🤖 AI School Setup", icon: Bot },
  { id: "academic", label: "Academic Year", icon: CalendarRange },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ─── Main Component ───────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    school: null,
    classesCount: 0,
    subjectsCount: 0,
    teachersCount: 0,
    studentsCount: 0,
  });
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/principal/setup");
      if (res.ok) {
        const data = await res.json();
        setSetupStatus(data);
      }
    } catch {
      // silently fail
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure your school profile, classes, subjects and more.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-900/60 border border-white/[0.06] w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile" && (
        <SchoolProfileTab
          initialData={setupStatus.school}
          onSaved={loadStatus}
        />
      )}
      {activeTab === "ai-setup" && (
        <AISetupTab setupStatus={setupStatus} onRefresh={loadStatus} />
      )}
      {activeTab === "academic" && <AcademicYearTab school={setupStatus.school} onSaved={loadStatus} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 1 — School Profile
// ═══════════════════════════════════════════════════════════════════════
function SchoolProfileTab({
  initialData,
  onSaved,
}: {
  initialData: SetupStatus["school"];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SchoolProfileForm>({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      city: initialData?.city ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      website: initialData?.website ?? "",
      establishedYear: initialData?.establishedYear?.toString() ?? "",
      academicYear: initialData?.academicYear ?? "",
      currentTerm: initialData?.currentTerm ?? "",
    },
  });

  // Re-populate when data loads
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? "",
        address: initialData.address ?? "",
        city: initialData.city ?? "",
        phone: initialData.phone ?? "",
        email: initialData.email ?? "",
        website: initialData.website ?? "",
        establishedYear: initialData.establishedYear?.toString() ?? "",
        academicYear: initialData.academicYear ?? "",
        currentTerm: initialData.currentTerm ?? "",
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: SchoolProfileForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/principal/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("School profile updated successfully!");
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update school profile");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  const fields: {
    name: keyof SchoolProfileForm;
    label: string;
    placeholder: string;
    type?: string;
    span?: boolean;
  }[] = [
    { name: "name", label: "School Name", placeholder: "Al-Noor School", span: true },
    { name: "address", label: "Address", placeholder: "123 Main Street", span: true },
    { name: "city", label: "City", placeholder: "Karachi" },
    { name: "phone", label: "Phone", placeholder: "+92 21 1234567", type: "tel" },
    { name: "email", label: "School Email", placeholder: "info@school.edu.pk", type: "email" },
    { name: "website", label: "Website", placeholder: "https://school.edu.pk", type: "url" },
    { name: "establishedYear", label: "Established Year", placeholder: "2005", type: "number" },
    { name: "academicYear", label: "Academic Year", placeholder: "2024-2025" },
    { name: "currentTerm", label: "Current Term", placeholder: "First Term" },
  ];

  return (
    <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
      <CardHeader className="border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <School className="size-4 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-white">
              School Profile
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Update your school information and contact details
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.span ? "md:col-span-2" : ""}
              >
                <Label
                  htmlFor={field.name}
                  className="text-xs font-medium text-gray-400 mb-1.5 block"
                >
                  {field.label}
                </Label>
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  {...register(field.name)}
                  className={cn(
                    "bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/10 h-10",
                    errors[field.name] && "border-red-500/50"
                  )}
                />
                {errors[field.name] && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 h-10 shadow-lg shadow-purple-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 2 — AI School Setup
// ═══════════════════════════════════════════════════════════════════════
function AISetupTab({
  setupStatus,
  onRefresh,
}: {
  setupStatus: SetupStatus;
  onRefresh: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date(),
    };
    setMessages((prev) => prev.filter((m) => !m.isLoading).concat(newMsg));
    return newMsg.id;
  };

  const addLoadingMessage = () => {
    const id = Math.random().toString(36).slice(2);
    setMessages((prev) => [
      ...prev,
      { id, role: "ai", content: "...", timestamp: new Date(), isLoading: true },
    ]);
    return id;
  };

  const removeLoadingMessages = () => {
    setMessages((prev) => prev.filter((m) => !m.isLoading));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput("");
    setIsProcessing(true);

    // Add user message
    addMessage({ role: "user", content: text });

    // Show loading bubble
    addLoadingMessage();

    // Small delay for realism
    await new Promise((r) => setTimeout(r, 600));
    removeLoadingMessages();

    const { type, parsed } = parseUserMessage(text);

    if (type === "classes") {
      const { grades, sections } = parsed as {
        grades: string[];
        sections: string[];
      };

      try {
        const res = await fetch("/api/principal/setup/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grades, sections }),
        });

        if (res.ok) {
          const data = await res.json();
          const list = data.created.slice(0, 12).join(", ");
          const more = data.created.length > 12 ? ` and ${data.created.length - 12} more` : "";
          addMessage({
            role: "ai",
            content: `✅ Done! I've created **${data.totalCreated} class${data.totalCreated !== 1 ? "es" : ""}**:\n\n${list}${more}${data.totalSkipped > 0 ? `\n\n⚠️ ${data.totalSkipped} already existed and were skipped.` : ""}\n\nWould you like to add subjects to these classes? For example: *"Add subjects Math, English, Science, Urdu to all classes"*`,
          });
          onRefresh();
        } else {
          addMessage({
            role: "ai",
            content: "⚠️ I couldn't create the classes — please check if the school profile is saved first.",
          });
        }
      } catch {
        addMessage({
          role: "ai",
          content: "❌ Network error while creating classes. Please try again.",
        });
      }
    } else if (type === "subjects") {
      const { subjects } = parsed as { subjects: string[] };

      if (!subjects.length) {
        addMessage({
          role: "ai",
          content: `I couldn't identify the subjects from your message. Please list them clearly, e.g.:\n\n*"Add subjects Math, English, Science, Urdu, Islamiat"*`,
        });
      } else {
        try {
          const res = await fetch("/api/principal/setup/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subjects }),
          });

          if (res.ok) {
            const data = await res.json();
            const list = data.created.map((s: string) => `${s} ✓`).join(", ");
            addMessage({
              role: "ai",
              content: `✅ Added **${data.totalCreated} subject${data.totalCreated !== 1 ? "s" : ""}**!\n\n${list}${data.totalSkipped > 0 ? `\n\n⚠️ ${data.totalSkipped} subject(s) already existed.` : ""}\n\nWould you like to set up the **fee structure** next? For example:\n*"Set fee: Nursery 3000, Grade 1-5 4000, Grade 6-10 5500 per month"*`,
            });
            onRefresh();
          } else {
            addMessage({
              role: "ai",
              content: "⚠️ I couldn't add subjects right now. Please try again.",
            });
          }
        } catch {
          addMessage({
            role: "ai",
            content: "❌ Network error while adding subjects. Please try again.",
          });
        }
      }
    } else if (type === "fees") {
      const { feeRanges } = parsed as {
        feeRanges: { label: string; amount: number }[];
      };

      if (!feeRanges.length) {
        addMessage({
          role: "ai",
          content: `I couldn't parse the fee structure from your message. Please specify like:\n\n*"Set fee: Nursery 3000, Grade 1-5 4000, Grade 6-10 5500"*`,
        });
      } else {
        try {
          const res = await fetch("/api/principal/setup/fees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feeRanges }),
          });

          if (res.ok) {
            const breakdown = feeRanges
              .map(
                (r) =>
                  `• ${r.label}: Rs. ${r.amount.toLocaleString()}/month`
              )
              .join("\n");
            addMessage({
              role: "ai",
              content: `✅ Fee structure configured!\n\n${breakdown}\n\nYour school setup is coming along great! 🎉\n\nWhat else would you like to set up? You can add teachers, students, or configure more settings.`,
            });
          } else {
            addMessage({
              role: "ai",
              content: "⚠️ I couldn't configure the fee structure. Please try again.",
            });
          }
        } catch {
          addMessage({
            role: "ai",
            content: "❌ Network error. Please try again.",
          });
        }
      }
    } else {
      // Unknown
      addMessage({
        role: "ai",
        content: `I understand you want to "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}". I can help with:\n\n• **Setting up classes and sections** — e.g., *"Add classes A and B from Nursery to Grade 10"*\n• **Adding subjects** — e.g., *"Add subjects Math, English, Science, Urdu"*\n• **Configuring fee structure** — e.g., *"Set fee: Nursery 3000, Grade 1-5 4000"*\n\nWhat would you like to do?`,
      });
    }

    setIsProcessing(false);
    inputRef.current?.focus();
  };

  // Checklist items
  const checklist = [
    {
      label: "School Profile",
      done: !!setupStatus.school?.name,
      value: setupStatus.school?.name ?? "",
      icon: School,
      color: "text-blue-400",
    },
    {
      label: "Classes Created",
      done: setupStatus.classesCount > 0,
      value: setupStatus.classesCount > 0 ? `${setupStatus.classesCount} classes` : "",
      icon: Building2,
      color: "text-emerald-400",
    },
    {
      label: "Subjects Added",
      done: setupStatus.subjectsCount > 0,
      value: setupStatus.subjectsCount > 0 ? `${setupStatus.subjectsCount} subjects` : "",
      icon: BookOpen,
      color: "text-purple-400",
    },
    {
      label: "Fee Structure Set",
      done: false, // comes from fees API
      value: "",
      icon: CreditCard,
      color: "text-orange-400",
    },
    {
      label: "First Teacher Added",
      done: setupStatus.teachersCount > 0,
      value: setupStatus.teachersCount > 0 ? `${setupStatus.teachersCount} teacher(s)` : "",
      icon: Users,
      color: "text-yellow-400",
    },
    {
      label: "First Student Added",
      done: setupStatus.studentsCount > 0,
      value: setupStatus.studentsCount > 0 ? `${setupStatus.studentsCount} student(s)` : "",
      icon: GraduationCap,
      color: "text-pink-400",
    },
  ];

  const completedCount = checklist.filter((c) => c.done).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Chat Interface (2/3 width) */}
      <div className="lg:col-span-2">
        <Card className="border border-purple-500/20 bg-gray-900/60 backdrop-blur-xl rounded-xl flex flex-col h-[600px]">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="size-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Afia — AI School Setup</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                {msg.role === "ai" && (
                  <div className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mt-1 shadow shadow-purple-500/20">
                    <Bot className="size-3.5 text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.isLoading ? "animate-pulse" : "",
                    msg.role === "ai"
                      ? "bg-gray-800/80 text-gray-100 rounded-tl-sm"
                      : "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-sm"
                  )}
                >
                  {msg.isLoading ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <div className="space-y-0.5">
                      {renderMarkdown(msg.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tell Afia what to set up..."
                disabled={isProcessing}
                className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isProcessing || !input.trim()}
                className={cn(
                  "size-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  input.trim() && !isProcessing
                    ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
                    : "bg-gray-800/60 text-gray-600 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 ml-1">
              Press Enter to send • AI features powered by EduMind
            </p>
          </div>
        </Card>
      </div>

      {/* Setup Checklist (1/3 width) */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">
                Setup Checklist
              </CardTitle>
              <button
                onClick={onRefresh}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded"
                title="Refresh"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                <span>{completedCount}/{checklist.length} complete</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {checklist.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    {item.done ? (
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="size-4 text-gray-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("size-3 shrink-0", item.color)} />
                        <p
                          className={cn(
                            "text-xs font-medium",
                            item.done ? "text-white" : "text-gray-500"
                          )}
                        >
                          {item.label}
                        </p>
                      </div>
                      {item.value && (
                        <p className="text-[10px] text-gray-600 mt-0.5 ml-4">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick prompt suggestions */}
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Quick Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Add classes A and B from Nursery to Grade 10",
              "Add subjects Math, English, Science, Urdu",
              "Set fee: Nursery 3000, Grade 1-5 4000, Grade 6-10 5500",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="w-full text-left text-[11px] text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all flex items-center gap-2 group"
              >
                <ChevronRight className="size-3 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                <span className="leading-snug">{prompt}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3 — Academic Year Settings
// ═══════════════════════════════════════════════════════════════════════
function AcademicYearTab({
  school,
  onSaved,
}: {
  school: SetupStatus["school"];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [academicYear, setAcademicYear] = useState(school?.academicYear ?? "");
  const [currentTerm, setCurrentTerm] = useState(school?.currentTerm ?? "");
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "1", name: "Independence Day", date: "2025-08-14" },
    { id: "2", name: "Eid ul Fitr", date: "2025-03-30" },
    { id: "3", name: "Eid ul Adha", date: "2025-06-07" },
    { id: "4", name: "Christmas", date: "2025-12-25" },
  ]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  useEffect(() => {
    if (school) {
      setAcademicYear(school.academicYear ?? "");
      setCurrentTerm(school.currentTerm ?? "");
    }
  }, [school]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/principal/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear, currentTerm }),
      });
      if (res.ok) {
        toast.success("Academic year settings saved!");
        onSaved();
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate) return;
    setHolidays((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        name: newHolidayName.trim(),
        date: newHolidayDate,
      },
    ]);
    setNewHolidayName("");
    setNewHolidayDate("");
  };

  const removeHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const TERMS = ["First Term", "Second Term", "Third Term", "Annual"];

  return (
    <div className="space-y-4">
      {/* Year & Term */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardHeader className="border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 text-purple-400" />
            <CardTitle className="text-sm font-semibold text-white">
              Academic Year Configuration
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-400 mb-1.5 block">
                Academic Year
              </Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-2025"
                className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 focus-visible:border-purple-500/50 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-400 mb-1.5 block">
                Current Term
              </Label>
              <div className="flex gap-2 flex-wrap">
                {TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => setCurrentTerm(term)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      currentTerm === term
                        ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                        : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 h-10 shadow-lg shadow-purple-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Holiday Calendar */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardHeader className="border-b border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 text-yellow-400" />
              <CardTitle className="text-sm font-semibold text-white">
                Holiday Calendar
              </CardTitle>
            </div>
            <span className="text-[11px] text-gray-500">
              {holidays.length} holiday{holidays.length !== 1 ? "s" : ""} configured
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Add Holiday */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              placeholder="Holiday name"
              className="flex-1 bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-9 text-sm"
            />
            <Input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-40 bg-gray-800/60 border-gray-700/60 text-white h-9 text-sm"
            />
            <Button
              onClick={addHoliday}
              disabled={!newHolidayName.trim() || !newHolidayDate}
              size="icon"
              className="h-9 w-9 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 shrink-0"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Holiday list */}
          <div className="space-y-2">
            {holidays
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/30 border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <CalendarRange className="size-3.5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">
                        {holiday.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Intl.DateTimeFormat("en-PK", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(holiday.date))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeHoliday(holiday.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
