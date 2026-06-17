"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  BookOpen,
  Key,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassOption {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function NewTeacherPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Lists from API
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form Fields State
  const [form, setForm] = useState({
    // Step 1: Personal Info
    name: "",
    phone: "",
    email: "",
    avatar: "",
    cnic: "",

    // Step 2: Professional Info
    qualification: "BA",
    specialization: "",
    joiningDate: new Date().toISOString().split("T")[0],
    salary: "",

    // Step 3: Class Assignment
    isClassTeacher: false,
    classId: "", // Managed class if Class Teacher
    subjectsToTeach: [] as string[], // array of subject IDs
    classesToTeach: [] as string[],  // array of class IDs

    // Step 4: Account Details
    tempPassword: "",
    sendCredentialsMethod: "screen",
  });

  // Load classes & subjects for assignments
  useEffect(() => {
    async function loadData() {
      try {
        const [resClasses, resSubjects] = await Promise.all([
          fetch("/api/principal/classes"),
          fetch("/api/principal/subjects"),
        ]);

        if (resClasses.ok) {
          const data = await resClasses.json();
          setClasses(data.classes ?? []);
        }
        if (resSubjects.ok) {
          const data = await resSubjects.json();
          setSubjects(data.subjects ?? []);
        }
      } catch {
        toast.error("Failed to load classes or subjects");
      }
      setLoadingOptions(false);
    }
    loadData();
  }, []);

  // Generate credentials once on Step 4 trigger
  useEffect(() => {
    if (currentStep === 4 && !form.tempPassword) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      setForm((prev) => ({
        ...prev,
        tempPassword: `TCH-PWD-${rand}`,
      }));
    }
  }, [currentStep, form.tempPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleClassTeacher = () => {
    setForm((prev) => ({
      ...prev,
      isClassTeacher: !prev.isClassTeacher,
      classId: !prev.isClassTeacher ? prev.classId : "", // reset class ID if unchecked
    }));
  };

  // Multi-select helpers
  const handleToggleSubject = (subjectId: string) => {
    setForm((prev) => {
      const current = prev.subjectsToTeach;
      const next = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId];
      return { ...prev, subjectsToTeach: next };
    });
  };

  const handleToggleClass = (classId: string) => {
    setForm((prev) => {
      const current = prev.classesToTeach;
      const next = current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId];
      return { ...prev, classesToTeach: next };
    });
  };

  // Mock Avatar Upload
  const handleAvatarUpload = () => {
    const avatars = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&fit=crop",
    ];
    const picked = avatars[Math.floor(Math.random() * avatars.length)];
    setForm((prev) => ({ ...prev, avatar: picked }));
    toast.success("Mock photo uploaded successfully!");
  };

  // Validation at stages
  const validateStep = (step: number) => {
    setError(null);
    if (step === 1) {
      if (!form.name.trim()) {
        setError("Full Name is required");
        toast.error("Full Name is required");
        return false;
      }
      if (!form.phone.trim()) {
        setError("Phone number is required");
        toast.error("Phone number is required");
        return false;
      }
      if (!form.email.trim()) {
        setError("Email address is required");
        toast.error("Email address is required");
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(form.email)) {
        setError("Please enter a valid email address");
        toast.error("Please enter a valid email address");
        return false;
      }
    }
    if (step === 2) {
      if (!form.joiningDate) {
        setError("Joining Date is required");
        toast.error("Joining Date is required");
        return false;
      }
    }
    if (step === 3) {
      if (form.isClassTeacher && !form.classId) {
        setError("Please select which class this teacher manages");
        toast.error("Please select which class this teacher manages");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Submission handler
  const [submitting, setSubmitting] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/principal/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Instructor registered successfully!");
        setCreatedTeacher(data.teacher);
        setCurrentStep(5); // Success step
      } else {
        setError(data.error ?? "Failed to save teacher records");
        toast.error(data.error ?? "Failed to save teacher records");
      }
    } catch {
      setError("No internet connection. Please check your network status.");
      toast.error("Network connection error");
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/principal/teachers">
          <Button variant="ghost" className="text-gray-400 hover:text-white pl-0 gap-1.5 h-8">
            <ArrowLeft className="size-4" />
            Back to Instructors
          </Button>
        </Link>
        <h1 className="text-sm font-semibold text-gray-500 font-mono">STEP {currentStep} OF 4</h1>
      </div>

      {/* Progress wizard indicator */}
      {currentStep <= 4 && (
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { step: 1, label: "Personal Info", icon: User },
            { step: 2, label: "Professional", icon: GraduationCap },
            { step: 3, label: "Class Assignments", icon: BookOpen },
            { step: 4, label: "Account Setup", icon: Key },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentStep >= item.step;
            const current = currentStep === item.step;
            return (
              <div
                key={item.step}
                onClick={() => currentStep > item.step && setCurrentStep(item.step)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer select-none",
                  current
                    ? "border-blue-500/50 bg-blue-500/5 text-blue-300"
                    : active
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : "border-white/[0.04] bg-white/[0.01] text-gray-600"
                )}
              >
                <Icon className={cn("size-4 mb-1", current && "animate-pulse")} />
                <span className="text-[10px] font-semibold hidden md:block tracking-wide uppercase shrink-0">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── STEP 1: PERSONAL INFO ── */}
      {currentStep === 1 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <User className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Personal Information</h2>
                <p className="text-gray-500 text-xs mt-1">Provide instructor biological and contact attributes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-gray-400">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Professor Ahmed Khan"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-gray-400">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 03009876543"
                  inputMode="tel"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-11 sm:h-10"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-gray-400">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. ahmed.khan@school.com"
                  inputMode="email"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-11 sm:h-10"
                />
              </div>

              {/* CNIC */}
              <div className="space-y-1.5">
                <Label htmlFor="cnic" className="text-xs text-gray-400">CNIC Identity Card (Optional)</Label>
                <Input
                  id="cnic"
                  name="cnic"
                  value={form.cnic}
                  onChange={handleChange}
                  placeholder="e.g. 37405-9876543-1"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
                />
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Instructor Avatar Photo (Optional)</Label>
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-2xl bg-gray-950/60 border border-gray-800 flex items-center justify-center overflow-hidden">
                  {form.avatar ? (
                    <Image
                      src={form.avatar}
                      alt="Teacher Preview"
                      width={80}
                      height={80}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Camera className="size-6 text-gray-600" />
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={handleAvatarUpload}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 h-9 text-xs border border-gray-700 shadow-sm"
                  >
                    Upload Avatar Mockup
                  </Button>
                  <p className="text-[10px] text-gray-500 mt-1">Upload `.jpg` or `.png` up to 2MB.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: PROFESSIONAL INFO ── */}
      {currentStep === 2 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <GraduationCap className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Professional Information</h2>
                <p className="text-gray-500 text-xs mt-1">Set qualifications, specialist areas, and salary bands.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Qualification dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Academic Qualification *</Label>
                <div className="relative">
                  <select
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    className="appearance-none w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Matric">Matric</option>
                    <option value="FA">FA</option>
                    <option value="BA">BA</option>
                    <option value="MA">MA</option>
                    <option value="B.Ed">B.Ed</option>
                    <option value="M.Ed">M.Ed</option>
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Specialization */}
              <div className="space-y-1.5">
                <Label htmlFor="specialization" className="text-xs text-gray-400">Specialization (Subject Expertise)</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="e.g. Mathematics, Theoretical Physics"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
                />
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <Label htmlFor="joiningDate" className="text-xs text-gray-400">Joining Date *</Label>
                <Input
                  id="joiningDate"
                  name="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={handleChange}
                  className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                />
              </div>

              {/* Salary */}
              <div className="space-y-1.5">
                <Label htmlFor="salary" className="text-xs text-gray-400">Basic Monthly Salary (Rs.)</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  placeholder="e.g. 75000"
                  value={form.salary}
                  onChange={handleChange}
                  inputMode="numeric"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-11 sm:h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: CLASS CURRICULUM ASSIGNMENTS ── */}
      {currentStep === 3 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <BookOpen className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Classroom Curriculum Assignments</h2>
                <p className="text-gray-500 text-xs mt-1">Assign class teacher duties and pick subjects to instruct.</p>
              </div>
            </div>

            {/* Is Class Teacher toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <input
                type="checkbox"
                id="isClassTeacher"
                checked={form.isClassTeacher}
                onChange={handleToggleClassTeacher}
                className="mt-0.5 size-4 rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-0"
              />
              <div className="space-y-1 select-none cursor-pointer" onClick={handleToggleClassTeacher}>
                <Label htmlFor="isClassTeacher" className="text-xs font-bold text-purple-300 cursor-pointer">
                  Designate as Class Teacher
                </Label>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Designating this instructor as a Class Teacher allows them to manage primary classroom check-ins, markings, and student announcements.
                </p>
              </div>
            </div>

            {/* Class managed selector */}
            {form.isClassTeacher && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs text-gray-400">Select Class Managed *</Label>
                <div className="relative">
                  <select
                    name="classId"
                    value={form.classId}
                    onChange={handleChange}
                    className="appearance-none w-full bg-gray-850 border border-gray-700 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none"
                  >
                    <option value="">Select Managed Class Section</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName || `${c.name} - ${c.section}`}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Subjects multi-select */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400 block font-semibold">Pick Subjects to Teach</Label>
                <div className="border border-gray-800 rounded-xl p-3 bg-gray-950/40 h-44 overflow-y-auto space-y-1.5">
                  {subjects.length > 0 ? (
                    subjects.map((sub) => {
                      const selected = form.subjectsToTeach.includes(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleToggleSubject(sub.id)}
                          className={cn(
                            "p-2 rounded-lg text-xs cursor-pointer select-none flex justify-between items-center transition-colors",
                            selected ? "bg-blue-600/15 border border-blue-500/30 text-blue-300" : "hover:bg-white/[0.02] text-gray-400 border border-transparent"
                          )}
                        >
                          <span>{sub.name} <span className="text-[10px] text-gray-500 font-mono">({sub.code})</span></span>
                          {selected && <div className="size-2 rounded-full bg-blue-400 animate-pulse" />}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-600 italic block p-4 text-center">No subjects configured in system.</span>
                  )}
                </div>
              </div>

              {/* Classes multi-select */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-400 block font-semibold">Pick Classes to Teach</Label>
                <div className="border border-gray-800 rounded-xl p-3 bg-gray-950/40 h-44 overflow-y-auto space-y-1.5">
                  {classes.length > 0 ? (
                    classes.map((cls) => {
                      const selected = form.classesToTeach.includes(cls.id);
                      return (
                        <div
                          key={cls.id}
                          onClick={() => handleToggleClass(cls.id)}
                          className={cn(
                            "p-2 rounded-lg text-xs cursor-pointer select-none flex justify-between items-center transition-colors",
                            selected ? "bg-purple-600/15 border border-purple-500/30 text-purple-300" : "hover:bg-white/[0.02] text-gray-400 border border-transparent"
                          )}
                        >
                          <span>{cls.displayName || `${cls.name} - ${cls.section}`}</span>
                          {selected && <div className="size-2 rounded-full bg-purple-400 animate-pulse" />}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-600 italic block p-4 text-center">No classes configured in system.</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: PORTAL ACCOUNT SETUP ── */}
      {currentStep === 4 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Key className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Portal Credentials Setup</h2>
                <p className="text-gray-500 text-xs mt-1">Review system settings and auto-generate portal passwords.</p>
              </div>
            </div>

            {/* Portal settings review */}
            <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.04] text-xs space-y-3">
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">Login Username / Email:</span>
                <span className="text-white font-semibold">{form.email || <span className="text-red-400 italic">Email missing!</span>}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-gray-500">Default Access Role:</span>
                <span className="text-blue-300 font-bold tracking-wider">TEACHER</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-gray-500">Auto-Generated Temporary Password:</span>
                <span className="bg-blue-600/20 border border-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono font-bold text-xs select-all">
                  {form.tempPassword}
                </span>
              </div>
            </div>

            {/* Distribution toggle */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-gray-400 font-semibold block">Distribution Channel</Label>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.01] cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sendCredentialsMethod"
                    id="methodScreen"
                    checked={form.sendCredentialsMethod === "screen"}
                    onChange={() => setForm((prev) => ({ ...prev, sendCredentialsMethod: "screen" }))}
                    className="size-4 bg-gray-800 border-gray-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <Label htmlFor="methodScreen" className="font-semibold text-white cursor-pointer select-none">
                      Show on Screen
                    </Label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Reveal the newly created portal credentials immediately after confirming.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-950/20 opacity-50 cursor-not-allowed">
                  <input
                    type="radio"
                    disabled
                    id="methodEmail"
                    className="size-4 bg-gray-800 border-gray-700 text-blue-600"
                  />
                  <div>
                    <Label htmlFor="methodEmail" className="font-semibold text-gray-500">
                      Send via Email <span className="text-[9px] text-blue-400 font-bold tracking-wide uppercase bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded-full ml-1">Coming Soon</span>
                    </Label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Dispatches secure mail alerts containing initial configurations.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 5: ONBOARDING COMPLETED ── */}
      {currentStep === 5 && createdTeacher && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl max-w-lg mx-auto text-center animate-fade-in">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Instructor Registration Complete!</h2>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">
                Teacher profile setup is complete and class assignment metrics have been successfully committed.
              </p>
            </div>

            {/* Portal keys review card */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-left max-w-sm mx-auto space-y-2">
              <h3 className="text-xs font-bold text-blue-300 flex items-center gap-1">
                <Sparkles className="size-4 text-blue-400" />
                Instructor Credentials
              </h3>
              <div className="text-xs space-y-1 font-sans">
                <p className="text-gray-400">
                  Username: <strong className="text-white font-mono">{form.email}</strong>
                </p>
                <p className="text-gray-400">
                  Temp Password: <span className="bg-blue-500/20 text-blue-200 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-bold">{form.tempPassword}</span>
                </p>
              </div>
              <span className="block text-[9.5px] text-blue-400 italic pt-1 border-t border-blue-500/10">
                ⚠️ Share these initial credentials with the teacher immediately.
              </span>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Link href="/principal/teachers">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Wizard navigation controllers ── */}
      {currentStep <= 4 && (
        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1 || submitting}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 h-10 px-4"
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-4 shadow-lg shadow-blue-500/20"
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitForm}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4 shadow-lg"
            >
              {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirm &amp; Register
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
