"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  User,
  BookOpen,
  MapPin,
  Users,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Camera,
  Search,
  Check,
  ShieldAlert,
  ArrowLeft,
  Printer,
  Barcode,
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
interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

interface ParentOption {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  relationship: string;
  childName: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN NEW STUDENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function NewStudentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Form Fields State
  const [form, setForm] = useState({
    // Step 1: Personal Info
    name: "",
    dateOfBirth: "",
    gender: "Male",
    bloodGroup: "A+",
    photo: "",
    medicalNotes: "",

    // Step 2: Academic Info
    admissionNumber: "",
    rollNumber: "",
    classId: "",
    admissionDate: new Date().toISOString().split("T")[0],

    // Step 3: Address
    address: "",

    // Step 4: Parent/Guardian Info
    parentOptionType: "search" as "search" | "new", // Search existing vs create new
    parentId: "", // ID of selected parent
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentRelationship: "Father",
    parentCNIC: "",
    parentOccupation: "",
    autoCreateParentAccount: true,
  });

  // Autocomplete parent searches
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [selectedParentObj, setSelectedParentObj] = useState<ParentOption | null>(null);

  // Submission Outcomes
  const [submitting, setSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate Admission Number
  useEffect(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setForm((prev) => ({
      ...prev,
      admissionNumber: prev.admissionNumber || `ADM-${year}-${rand}`,
    }));
  }, []);

  // Fetch classes for step 2 dropdown
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/principal/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes ?? []);
        }
      } catch {
        toast.error("Failed to load classes dropdown");
      }
      setClassesLoading(false);
    }
    fetchClasses();
  }, []);

  // Search existing parents
  useEffect(() => {
    if (parentSearch.length < 2) {
      setParentOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingParents(true);
      try {
        const res = await fetch(`/api/principal/parents?search=${encodeURIComponent(parentSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setParentOptions(data.parents ?? []);
        }
      } catch { /* silent */ }
      setSearchingParents(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [parentSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectParent = (parent: ParentOption) => {
    setSelectedParentObj(parent);
    setForm((prev) => ({
      ...prev,
      parentId: parent.id,
      parentName: parent.name,
      parentPhone: parent.phone,
      parentRelationship: parent.relationship,
    }));
    setParentSearch("");
    setParentOptions([]);
    toast.success(`Selected parent: ${parent.name}`);
  };

  const handleClearSelectedParent = () => {
    setSelectedParentObj(null);
    setForm((prev) => ({
      ...prev,
      parentId: "",
      parentName: "",
      parentPhone: "",
    }));
  };

  // Basic Client Validation at each step
  const validateStep = (step: number) => {
    setError(null);
    if (step === 1) {
      if (!form.name.trim()) {
        setError("Full Name is required");
        toast.error("Full Name is required");
        return false;
      }
      if (!form.dateOfBirth) {
        setError("Date of Birth is required");
        toast.error("Date of Birth is required");
        return false;
      }
    }
    if (step === 2) {
      if (!form.admissionNumber.trim()) {
        setError("Admission Number is required");
        toast.error("Admission Number is required");
        return false;
      }
      if (!form.classId) {
        setError("Please assign a Class");
        toast.error("Please assign a Class");
        return false;
      }
    }
    if (step === 4) {
      if (form.parentOptionType === "search" && !form.parentId) {
        setError("Please search and select an existing Parent, or click 'Create New Parent'");
        toast.error("Please search and select an existing Parent, or click 'Create New Parent'");
        return false;
      }
      if (form.parentOptionType === "new") {
        if (!form.parentName.trim()) {
        setError("Parent Name is required");
        toast.error("Parent Name is required");
        return false;
      }
        if (!form.parentPhone.trim()) {
        setError("Parent Phone Number is required");
        toast.error("Parent Phone Number is required");
        return false;
      }
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

  // Submit Handler
  const handleSubmitForm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/principal/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Conditionally submit parent properties
          parentId: form.parentOptionType === "search" ? form.parentId : undefined,
          parentName: form.parentOptionType === "new" ? form.parentName : undefined,
          parentPhone: form.parentOptionType === "new" ? form.parentPhone : undefined,
          parentEmail: form.parentOptionType === "new" ? form.parentEmail : undefined,
          parentRelationship: form.parentOptionType === "new" ? form.parentRelationship : undefined,
          parentCNIC: form.parentOptionType === "new" ? form.parentCNIC : undefined,
          parentOccupation: form.parentOptionType === "new" ? form.parentOccupation : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Student registered successfully!");
        setCreatedStudent(data.student);
        setTempPassword(data.tempPassword);
        setCurrentStep(6); // Success screen (Step 6)
      } else {
        setError(data.error ?? "Failed to save student record");
        toast.error(data.error ?? "Failed to save student record");
      }
    } catch {
      setError("No internet connection. Please check your network status.");
      toast.error("Network connection error");
    }
    setSubmitting(false);
  };

  // Mock Avatar Upload
  const handlePhotoUpload = () => {
    // Generate a beautiful placeholder UI avatar
    const avatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&fit=crop",
    ];
    const picked = avatars[Math.floor(Math.random() * avatars.length)];
    setForm((prev) => ({ ...prev, photo: picked }));
    toast.success("Mock photo uploaded successfully!");
  };

  // Selected Class details for review
  const selectedClass = classes.find((c) => c.id === form.classId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/principal/students">
          <Button variant="ghost" className="text-gray-400 hover:text-white pl-0 gap-1.5 h-8">
            <ArrowLeft className="size-4" />
            Back to List
          </Button>
        </Link>
        <h1 className="text-sm font-semibold text-gray-500 font-mono">STEP {currentStep} OF 5</h1>
      </div>

      {/* Progress Wizard Bar */}
      {currentStep <= 5 && (
        <div className="grid grid-cols-5 gap-2.5">
          {[
            { step: 1, label: "Personal Info", icon: User },
            { step: 2, label: "Academic Info", icon: BookOpen },
            { step: 3, label: "Address Details", icon: MapPin },
            { step: 4, label: "Parent/Guardian", icon: Users },
            { step: 5, label: "Review & Submit", icon: Eye },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentStep >= item.step;
            const current = currentStep === item.step;
            return (
              <div
                key={item.step}
                onClick={() => currentStep > item.step && setCurrentStep(item.step)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center shrink-0 cursor-pointer select-none",
                  current
                    ? "border-blue-500/50 bg-blue-500/5 text-blue-300"
                    : active
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : "border-white/[0.04] bg-white/[0.01] text-gray-600"
                )}
              >
                <Icon className={cn("size-4 mb-1 shrink-0", current && "animate-pulse")} />
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
                <p className="text-gray-500 text-xs mt-1">Provide student biological and identity attributes.</p>
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
                  placeholder="e.g. Ayesha Rahman"
                  className="bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" className="text-xs text-gray-400">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Gender *</Label>
                <div className="relative">
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="appearance-none w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Blood Group</Label>
                <div className="relative">
                  <select
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={handleChange}
                    className="appearance-none w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-blue-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Student Photo (Optional)</Label>
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-2xl bg-gray-950/60 border border-gray-800 flex items-center justify-center overflow-hidden">
                  {form.photo ? (
                    <Image
                      src={form.photo}
                      alt="Student Preview"
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
                    onClick={handlePhotoUpload}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 h-9 text-xs border border-gray-700 shadow-sm"
                  >
                    Upload Avatar Mockup
                  </Button>
                  <p className="text-[10px] text-gray-500 mt-1">Upload `.jpg` or `.png` up to 2MB.</p>
                </div>
              </div>
            </div>

            {/* Medical Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="medicalNotes" className="text-xs text-gray-400">Medical Notes (Optional)</Label>
              <textarea
                id="medicalNotes"
                name="medicalNotes"
                value={form.medicalNotes}
                onChange={handleChange}
                placeholder="e.g. Asthmatic, carries inhaler. Penicillin allergy."
                className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 h-20"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: ACADEMIC INFO ── */}
      {currentStep === 2 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BookOpen className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Academic Details</h2>
                <p className="text-gray-500 text-xs mt-1">Set registration keys and assign current class/grade.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Admission Number */}
              <div className="space-y-1.5">
                <Label htmlFor="admissionNumber" className="text-xs text-gray-400">Admission Number *</Label>
                <div className="relative">
                  <Input
                    id="admissionNumber"
                    name="admissionNumber"
                    value={form.admissionNumber}
                    onChange={handleChange}
                    className="bg-gray-800/60 border-gray-700/60 text-white font-mono h-10"
                  />
                  <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400 pointer-events-none" />
                </div>
              </div>

              {/* Roll Number */}
              <div className="space-y-1.5">
                <Label htmlFor="rollNumber" className="text-xs text-gray-400">Roll Number</Label>
                <Input
                  id="rollNumber"
                  name="rollNumber"
                  placeholder="e.g. 18"
                  value={form.rollNumber}
                  onChange={handleChange}
                  className="bg-gray-800/60 border-gray-700/60 text-white font-mono h-10"
                />
              </div>

              {/* Class Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Class &amp; Section *</Label>
                <div className="relative">
                  <select
                    name="classId"
                    value={form.classId}
                    onChange={handleChange}
                    className="appearance-none w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-10 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName || `${c.name} - ${c.section}`}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                </div>
                {classesLoading && <span className="text-[10px] text-gray-500 animate-pulse">Loading available classes...</span>}
              </div>

              {/* Admission Date */}
              <div className="space-y-1.5">
                <Label htmlFor="admissionDate" className="text-xs text-gray-400">Admission Date *</Label>
                <Input
                  id="admissionDate"
                  name="admissionDate"
                  type="date"
                  value={form.admissionDate}
                  onChange={handleChange}
                  className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: ADDRESS ── */}
      {currentStep === 3 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <MapPin className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Home Address</h2>
                <p className="text-gray-500 text-xs mt-1">Specify primary residential details of the student.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs text-gray-400">Street Address</Label>
              <textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. House No. 12-B, Sector F-8/2, Islamabad"
                className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 h-32"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: PARENT / GUARDIAN ── */}
      {currentStep === 4 && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-none">Parent &amp; Guardian Links</h2>
                <p className="text-gray-500 text-xs mt-1">Link an existing parent account or register a new user.</p>
              </div>
            </div>

            {/* Toggle Search vs Create */}
            <div className="grid grid-cols-2 p-1 bg-gray-950/60 border border-gray-800 rounded-lg max-w-sm">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, parentOptionType: "search" }))}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all select-none",
                  form.parentOptionType === "search" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Search Existing Parent
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, parentOptionType: "new" }))}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all select-none",
                  form.parentOptionType === "new" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Create New Parent
              </button>
            </div>

            {/* OPTION A: SEARCH EXISTING PARENT */}
            {form.parentOptionType === "search" && (
              <div className="space-y-4">
                {selectedParentObj ? (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Check className="size-4 text-emerald-400" />
                        {selectedParentObj.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Phone: {selectedParentObj.phone} · Relationship: {selectedParentObj.relationship}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Linked to current child: {selectedParentObj.childName}
                      </div>
                    </div>
                    <Button
                      onClick={handleClearSelectedParent}
                      variant="outline"
                      className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 h-8 text-xs px-2.5"
                    >
                      Clear Selection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Search Parent (Type Name or Phone Number)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <Input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder="Type at least 2 characters..."
                        className="pl-9 bg-gray-800/60 border-gray-700/60 text-white placeholder:text-gray-600 h-10"
                      />
                      {searchingParents && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gray-500" />}
                    </div>

                    {parentOptions.length > 0 && (
                      <div className="border border-gray-800 rounded-xl bg-gray-950 overflow-hidden divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                        {parentOptions.map((opt) => (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectParent(opt)}
                            className="p-3 hover:bg-white/[0.02] cursor-pointer transition-colors text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-semibold text-white">{opt.name}</div>
                              <div className="text-gray-500 mt-0.5">Phone: {opt.phone}</div>
                            </div>
                            <span className="text-[10px] text-gray-500 border border-white/[0.08] px-2 py-0.5 rounded-full font-mono bg-white/[0.01]">
                              child: {opt.childName}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {parentSearch.length >= 2 && parentOptions.length === 0 && !searchingParents && (
                      <p className="text-xs text-gray-500 italic mt-1.5 pl-1">No parents matching criteria found.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* OPTION B: CREATE NEW PARENT */}
            {form.parentOptionType === "new" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parent Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="parentName" className="text-xs text-gray-400">Parent Name *</Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      value={form.parentName}
                      onChange={handleChange}
                      placeholder="e.g. Tariq Rahman"
                      className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                    />
                  </div>

                  {/* Parent Phone (Username) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="parentPhone" className="text-xs text-gray-400">Phone Number * (Login Username)</Label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      value={form.parentPhone}
                      onChange={handleChange}
                      placeholder="e.g. 03001234567"
                      inputMode="tel"
                      className="bg-gray-800/60 border-gray-700/60 text-white h-11 sm:h-10"
                    />
                  </div>

                  {/* Relationship */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Relationship *</Label>
                    <div className="relative">
                      <select
                        name="parentRelationship"
                        value={form.parentRelationship}
                        onChange={handleChange}
                        className="appearance-none w-full bg-gray-800/60 border border-gray-700/60 text-white text-sm rounded-lg pl-3 pr-8 h-11 sm:h-10 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                      <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 size-3.5 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Parent Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="parentEmail" className="text-xs text-gray-400">Email Address (Optional)</Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      value={form.parentEmail}
                      onChange={handleChange}
                      placeholder="e.g. parent@example.com"
                      inputMode="email"
                      className="bg-gray-800/60 border-gray-700/60 text-white h-11 sm:h-10"
                    />
                  </div>

                  {/* Parent CNIC */}
                  <div className="space-y-1.5">
                    <Label htmlFor="parentCNIC" className="text-xs text-gray-400">CNIC (Optional)</Label>
                    <Input
                      id="parentCNIC"
                      name="parentCNIC"
                      placeholder="e.g. 37405-1234567-1"
                      value={form.parentCNIC}
                      onChange={handleChange}
                      className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                    />
                  </div>

                  {/* Occupation */}
                  <div className="space-y-1.5">
                    <Label htmlFor="parentOccupation" className="text-xs text-gray-400">Occupation (Optional)</Label>
                    <Input
                      id="parentOccupation"
                      name="parentOccupation"
                      placeholder="e.g. Software Engineer"
                      value={form.parentOccupation}
                      onChange={handleChange}
                      className="bg-gray-800/60 border-gray-700/60 text-white h-10"
                    />
                  </div>
                </div>

                {/* Auto Create toggle */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mt-2">
                  <input
                    type="checkbox"
                    id="autoCreateParentAccount"
                    checked={form.autoCreateParentAccount}
                    onChange={(e) => setForm((prev) => ({ ...prev, autoCreateParentAccount: e.target.checked }))}
                    className="mt-0.5 size-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <Label htmlFor="autoCreateParentAccount" className="text-xs font-semibold text-blue-300 select-none cursor-pointer">
                      Auto-generate Parent User Login Portal Account
                    </Label>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                      Creates a portal login with the parent's phone number as the username, and auto-generates a temporary password that will be revealed once upon successful student registration.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 5: REVIEW & SUBMIT ── */}
      {currentStep === 5 && (
        <div className="space-y-5">
          {/* Form Confirmation card */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Eye className="size-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-none">Review Information</h2>
                  <p className="text-gray-500 text-xs mt-1">Review student registry entry details before committing.</p>
                </div>
              </div>

              {/* Review sections */}
              <div className="space-y-4">
                {/* Personal Info */}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Personal Details</span>
                    <button onClick={() => setCurrentStep(1)} className="text-xs text-blue-400 hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Full Name</span>
                      <span className="text-white font-medium">{form.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Date of Birth</span>
                      <span className="text-white font-medium">{form.dateOfBirth}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Gender</span>
                      <span className="text-white font-medium">{form.gender}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Blood Group</span>
                      <span className="text-white font-medium">{form.bloodGroup}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block">Medical Notes</span>
                      <span className="text-white font-medium">{form.medicalNotes || "None"}</span>
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Academic &amp; School Info</span>
                    <button onClick={() => setCurrentStep(2)} className="text-xs text-blue-400 hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Admission Number</span>
                      <span className="text-white font-mono font-medium">{form.admissionNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Roll Number</span>
                      <span className="text-white font-mono font-medium">{form.rollNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Assigned Class</span>
                      <span className="text-white font-medium">{selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : "None"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Admission Date</span>
                      <span className="text-white font-medium">{form.admissionDate}</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Residential Location</span>
                    <button onClick={() => setCurrentStep(3)} className="text-xs text-blue-400 hover:underline">
                      Edit
                    </button>
                  </div>
                  <span className="text-xs text-white leading-relaxed">{form.address || <span className="text-gray-600 italic">No address provided</span>}</span>
                </div>

                {/* Parent Info */}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Parent &amp; Guardian Linking</span>
                    <button onClick={() => setCurrentStep(4)} className="text-xs text-blue-400 hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Parent Name</span>
                      <span className="text-white font-medium">{form.parentName || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Phone Number</span>
                      <span className="text-white font-medium">{form.parentPhone || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Relationship</span>
                      <span className="text-white font-medium">{form.parentRelationship}</span>
                    </div>
                    {form.parentOptionType === "new" && (
                      <>
                        <div>
                          <span className="text-gray-500 block">Parent Email</span>
                          <span className="text-white font-medium">{form.parentEmail || "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Parent CNIC</span>
                          <span className="text-white font-medium">{form.parentCNIC || "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Parent Login Account</span>
                          <span className="text-blue-300 font-semibold">{form.autoCreateParentAccount ? "Yes (Generate temporary password)" : "No"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 6: SUCCESS SCREEN & ID CARD PREVIEW ── */}
      {currentStep === 6 && createdStudent && (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl max-w-2xl mx-auto overflow-hidden animate-fade-in">
          <CardContent className="p-8 text-center space-y-6">
            {/* Header Success icons */}
            <div className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle className="size-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Student Registration Complete!</h2>
              <p className="text-gray-400 text-xs max-w-md mx-auto">
                Student details are logged and parent user accounts have been successfully registered in the database.
              </p>
            </div>

            {/* Parent temporary password notice */}
            {tempPassword && (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 max-w-md mx-auto text-left">
                <div className="flex gap-2">
                  <ShieldAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-300">🔑 Parent Temporary Credentials Generated</span>
                    <p className="text-[10.5px] text-gray-400 mt-1 leading-relaxed">
                      Username / Email: <strong className="text-white font-mono">{form.parentEmail || `${form.parentPhone}@edumind.com`}</strong>
                    </p>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">
                      Temporary Password: <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold text-xs">{tempPassword}</span>
                    </p>
                    <span className="block mt-2 text-[9.5px] text-amber-400 font-medium">
                      ⚠️ Note: Show or copy this password to the parent now. It is shown once for security reasons.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ID Card Mockup container */}
            <div className="py-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">Digital Student ID Card</span>
              
              {/* Actual Plastic Badge Graphic */}
              <div className="w-80 h-112 bg-gradient-to-b from-gray-950 to-gray-900 border border-white/[0.08] rounded-2xl mx-auto shadow-2xl overflow-hidden text-left flex flex-col justify-between p-5 relative select-none">
                {/* Card Glow Effect */}
                <div className="absolute -top-10 -left-10 size-40 bg-blue-500/10 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -right-10 size-40 bg-purple-500/10 blur-3xl rounded-full" />

                {/* Badge top branding */}
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 relative z-10">
                  <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wider leading-none uppercase">EduMind AI</h3>
                    <span className="text-[8px] text-gray-500 font-mono">Student Identification Badge</span>
                  </div>
                </div>

                {/* Student Photo */}
                <div className="my-4 flex flex-col items-center relative z-10">
                  <div className="size-24 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40 p-1">
                    {form.photo ? (
                      <Image
                        src={form.photo}
                        alt="ID Student"
                        width={96}
                        height={96}
                        className="size-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="size-full rounded-full bg-gray-900 flex items-center justify-center text-blue-300 text-2xl font-bold uppercase">
                        {form.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide mt-2">{form.name}</h4>
                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full mt-1.5">
                    STUDENT
                  </span>
                </div>

                {/* Card details body */}
                <div className="space-y-1.5 border-t border-white/[0.04] pt-3 relative z-10 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Admission No:</span>
                    <span className="text-white font-semibold font-mono">{form.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Class &amp; Sec:</span>
                    <span className="text-white font-semibold">{selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Roll Number:</span>
                    <span className="text-white font-semibold font-mono">{form.rollNumber || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Blood Group:</span>
                    <span className="text-red-400 font-bold">{form.bloodGroup}</span>
                  </div>
                </div>

                {/* Barcode Footer */}
                <div className="border-t border-white/[0.06] pt-3 flex flex-col items-center gap-1 mt-2">
                  <Barcode className="size-16 w-full text-gray-500" />
                  <span className="text-[7.5px] font-mono text-gray-600 uppercase tracking-widest">{form.admissionNumber}</span>
                </div>
              </div>
            </div>

            {/* Back action keys */}
            <div className="flex gap-3 justify-center pt-3">
              <Button
                type="button"
                onClick={() => {
                  window.print();
                }}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Printer className="size-4 mr-1.5" />
                Print / Download
              </Button>
              <Link href="/principal/students">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Wizard navigation controllers ── */}
      {currentStep <= 5 && (
        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1 || submitting}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 h-10 px-4"
          >
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-4 shadow-lg shadow-blue-500/20"
            >
              Next Step
              <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitForm}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4 shadow-lg shadow-emerald-500/20"
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
