"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  Calendar,
  FileText,
  CreditCard,
  Users,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  MapPin,
  Heart,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ParentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
}

interface Parent {
  id: string;
  relationship: string;
  occupation: string | null;
  cnic: string | null;
  user: ParentUser;
}

interface Attendance {
  date: string;
  status: string;
}

interface Fee {
  id: string;
  amount: number;
  paidAmount: number;
  feeType: string;
  month: string;
  year: number;
  status: string;
  paidAt: string | null;
  dueDate: string;
}

interface ExamResult {
  id: string;
  marksObtained: number;
  exam: {
    title: string;
    totalMarks: number;
    passingMarks: number;
    examType: string;
    examDate: string;
    subject: {
      name: string;
    };
  };
}

interface Submission {
  id: string;
  content: string | null;
  marksObtained: number | null;
  status: string;
  createdAt: string;
  assignment: {
    title: string;
    dueDate: string;
    totalMarks: number;
    subject: {
      name: string;
    };
  };
}

interface ClassSubject {
  id: string;
  subject: {
    id: string;
    name: string;
  };
  teacher: {
    user: {
      name: string;
    };
  } | null;
}

interface StudentDetail {
  id: string;
  name: string;
  rollNumber: string | null;
  dateOfBirth: string;
  gender: string;
  photo: string | null;
  address: string | null;
  admissionDate: string;
  admissionNumber: string;
  bloodGroup: string | null;
  medicalNotes: string | null;
  isActive: boolean;
  attendancePct: number | null;
  class: {
    id: string;
    name: string;
    section: string;
    gradeLevel: number;
    capacity: number;
    classTeacher: {
      user: {
        name: string;
        email: string;
        phone: string | null;
      };
    } | null;
    classSubjects: ClassSubject[];
  } | null;
  parents: Parent[];
  attendances: Attendance[];
  fees: Fee[];
  examResults: ExamResult[];
  submissions: Submission[];
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadStudentDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/principal/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student ?? null);
      } else {
        toast.error("Student profile not found");
        router.push("/principal/students");
      }
    } catch {
      toast.error("Network error fetching details");
    }
    setLoading(false);
  }, [studentId, router]);

  useEffect(() => {
    if (studentId) {
      loadStudentDetail();
    }
  }, [studentId, loadStudentDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-blue-500" />
        <p className="text-gray-500 text-sm">Loading student profile record...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-gray-500 space-y-2">
        <p>No student found</p>
        <Link href="/principal/students">
          <Button>Back to Students</Button>
        </Link>
      </div>
    );
  }

  // Format attendance records count
  const totalAtt = student.attendances.length;
  const presentCount = student.attendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const absentCount = student.attendances.filter(a => a.status === "ABSENT").length;
  const leaveCount = student.attendances.filter(a => a.status === "LEAVE").length;

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header Back Link ── */}
      <div>
        <Link href="/principal/students">
          <Button variant="ghost" className="text-gray-400 hover:text-white pl-0 gap-1.5 h-8">
            <ArrowLeft className="size-4" />
            Back to Students List
          </Button>
        </Link>
      </div>

      {/* ── Student Header Card ── */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
        <CardContent className="p-6 pt-12 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar Photo */}
          <div className="size-24 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 p-1 shrink-0 shadow-xl shadow-black/20">
            {student.photo ? (
              <Image
                src={student.photo}
                alt={student.name}
                width={96}
                height={96}
                className="size-full rounded-xl object-cover"
              />
            ) : (
              <InitialsAvatar name={student.name} size={96} className="size-full rounded-xl text-3xl" />
            )}
          </div>

          {/* Core Info */}
          <div className="text-center md:text-left space-y-1.5 flex-1">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-wide">{student.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  student.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                <span className={cn("size-1.5 rounded-full", student.isActive ? "bg-emerald-400" : "bg-red-400")} />
                {student.isActive ? "Active Student" : "Deactivated"}
              </span>
            </div>
            <p className="text-sm font-mono text-gray-500">
              Admission ID: <span className="text-gray-300 font-semibold">{student.admissionNumber}</span>
              {student.rollNumber && ` · Roll No: ${student.rollNumber}`}
            </p>

            {/* Quick Badges list */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-2">
              <div className="bg-white/[0.02] border border-white/[0.06] text-gray-300 text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-blue-400" />
                <span>
                  Class: <strong>{student.class ? `${student.class.name}-${student.class.section}` : "Unassigned"}</strong>
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] text-gray-300 text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-400" />
                <span>
                  Attendance:{" "}
                  <strong className={cn(student.attendancePct && student.attendancePct < 75 ? "text-red-400" : "text-emerald-400")}>
                    {student.attendancePct !== null ? `${student.attendancePct}%` : "No logs"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs Navigation Menu ── */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto gap-2 pb-px scrollbar-none select-none">
        {[
          { id: "overview", label: "Overview", icon: User },
          { id: "academic", label: "Academic", icon: BookOpen },
          { id: "attendance", label: "Attendance Log", icon: Calendar },
          { id: "assignments", label: "Assignments", icon: FileText },
          { id: "fees", label: "Fees Ledger", icon: CreditCard },
          { id: "parents", label: "Parents Info", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 py-3 px-4 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all whitespace-nowrap outline-none select-none shrink-0",
                active
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent text-gray-500 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="space-y-6">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Column A: Biodata Details */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl md:col-span-2">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Biodata Information</CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Full Name</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{student.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date of Birth</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Gender</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{student.gender}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Blood Group</span>
                  <span className="text-red-400 text-sm font-bold mt-0.5 block">{student.bloodGroup || "Not recorded"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date of Admission</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "-"}</span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-gray-500 block">Residential Address</span>
                  <div className="flex gap-1.5 mt-1.5 items-start">
                    <MapPin className="size-4 text-gray-600 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm leading-relaxed">{student.address || "No address submitted"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column B: Medical notes & health alerts */}
            <div className="space-y-6">
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                  <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="size-4 text-red-400" />
                    Health &amp; Medical Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {student.medicalNotes ? (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex gap-2">
                      <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 leading-relaxed font-semibold">
                        {student.medicalNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-600 text-xs italic">
                      No medical alerts or historical notes logged.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 2. ACADEMIC TAB */}
        {activeTab === "academic" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Left Col: Assigned subjects */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl md:col-span-2">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Class Subjects Curriculum</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {student.class && student.class.classSubjects.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {student.class.classSubjects.map((cs) => (
                      <div key={cs.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01] transition-colors">
                        <div>
                          <div className="text-sm font-semibold text-white tracking-wide">{cs.subject.name}</div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Code: {cs.subject.id.slice(-6)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block">Instructor</span>
                          <span className="text-gray-300 font-medium">{cs.teacher?.user.name || <span className="text-gray-600 italic">Unassigned</span>}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-600 text-xs italic">
                    No subjects curriculum configured for this class section.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Col: Class Teacher card */}
            <div className="space-y-6">
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                  <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Class Teacher</CardTitle>
                </CardHeader>
                <CardContent className="p-5 text-center space-y-4">
                  {student.class && student.class.classTeacher ? (
                    <>
                      <div className="size-16 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl font-bold mx-auto">
                        {student.class.classTeacher.user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">{student.class.classTeacher.user.name}</h4>
                        <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                          CLASS TEACHER
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-3 border-t border-white/[0.04] text-xs text-left">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">{student.class.classTeacher.user.email}</span>
                        </div>
                        {student.class.classTeacher.user.phone && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone className="size-3.5 shrink-0" />
                            <span>{student.class.classTeacher.user.phone}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-gray-600 text-xs italic">
                      No class teacher assigned to this section.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 3. ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Stats Summary Panel */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="text-center py-6 border-b border-white/[0.04]">
                  <span className="text-3xl font-extrabold text-white">
                    {student.attendancePct !== null ? `${student.attendancePct}%` : "No Logs"}
                  </span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Average Attendance Rate</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold block">{presentCount}</span>
                    <span className="text-[9px] text-gray-500 block">Present</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <span className="text-red-400 font-bold block">{absentCount}</span>
                    <span className="text-[9px] text-gray-500 block">Absent</span>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <span className="text-yellow-400 font-bold block">{leaveCount}</span>
                    <span className="text-[9px] text-gray-500 block">Leaves</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 leading-relaxed text-center italic pt-2">
                  Logs represent recorded sessions since registration.
                </div>
              </CardContent>
            </Card>

            {/* Attendance Logs List */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl md:col-span-2">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Historical Logs (Last 90 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[380px] overflow-y-auto">
                {student.attendances.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {student.attendances.map((a, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-gray-400 font-mono">
                            <Clock className="size-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{new Date(a.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold border",
                            a.status === "PRESENT"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : a.status === "LATE"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : a.status === "ABSENT"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          )}
                        >
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-600 text-xs italic">
                    No attendance records registered yet for this student.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. ASSIGNMENTS TAB */}
        {activeTab === "assignments" && (
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl animate-fade-in">
            <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Assignment Submissions Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {student.submissions.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {student.submissions.map((sub) => (
                    <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-white/[0.01] transition-colors gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{sub.assignment.title}</div>
                        <div className="text-gray-500 mt-1 flex items-center gap-2">
                          <span>Subject: <strong>{sub.assignment.subject.name}</strong></span>
                          <span>·</span>
                          <span>Due: {new Date(sub.assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-gray-500 block">Score Card</span>
                          <span className="text-white font-bold font-mono">
                            {sub.marksObtained !== null ? `${sub.marksObtained} / ${sub.assignment.totalMarks}` : "Ungraded"}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold border shrink-0",
                            sub.status === "GRADED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          )}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-600 text-xs italic">
                  No assignments submitted or assigned to this student.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5. FEES TAB */}
        {activeTab === "fees" && (
          <div className="space-y-6 animate-fade-in">
            {/* Total Balance Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Total Invoiced", value: student.fees.reduce((acc, curr) => acc + curr.amount, 0), color: "text-blue-400" },
                { label: "Paid Amount", value: student.fees.reduce((acc, curr) => acc + curr.paidAmount, 0), color: "text-emerald-400" },
                {
                  label: "Remaining Outstanding Balance",
                  value: student.fees.reduce((acc, curr) => acc + (curr.amount - curr.paidAmount), 0),
                  color: "text-red-400",
                },
              ].map((fstat, idx) => (
                <Card key={idx} className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{fstat.label}</span>
                      <p className={cn("text-2xl font-black mt-1", fstat.color)}>Rs. {fstat.value.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Invoices list */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Fee Invoices Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {student.fees.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Fee Details / Month</th>
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Total Amount</th>
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Paid Amount</th>
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Due Date</th>
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Payment Date</th>
                        <th className="p-3.5 text-gray-500 font-semibold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.fees.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                          <td className="p-3.5">
                            <span className="font-semibold text-white tracking-wide">
                              {invoice.feeType} Fee — {invoice.month} {invoice.year}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-300 font-bold font-mono">Rs. {invoice.amount.toLocaleString()}</td>
                          <td className="p-3.5 text-gray-300 font-bold font-mono">Rs. {invoice.paidAmount.toLocaleString()}</td>
                          <td className="p-3.5 text-gray-400">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                          <td className="p-3.5 text-gray-400">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "-"}</td>
                          <td className="p-3.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full font-bold border text-[10px]",
                                invoice.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : invoice.status === "OVERDUE"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              )}
                            >
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-16 text-gray-600 text-xs italic">
                    No fee invoice sheets configured for this student.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 6. PARENTS TAB */}
        {activeTab === "parents" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {student.parents.length > 0 ? (
              student.parents.map((p) => (
                <Card key={p.id} className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
                  <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Primary Parent / Guardian</CardTitle>
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {p.relationship}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold uppercase">
                        {p.user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">{p.user.name}</h4>
                        <span className="text-[10px] text-gray-500 mt-0.5 block">{p.occupation || "Occupation unlisted"}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-white/[0.04] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Contact Number:</span>
                        <span className="text-white font-semibold font-mono">{p.user.phone}</span>
                      </div>
                      {p.user.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Email Address:</span>
                          <span className="text-white font-medium">{p.user.email}</span>
                        </div>
                      )}
                      {p.cnic && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">CNIC Identity:</span>
                          <span className="text-white font-mono">{p.cnic}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick call to actions */}
                    <div className="flex gap-2 pt-2">
                      <a href={`tel:${p.user.phone}`} className="flex-1">
                        <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800 text-gray-300 h-9 text-xs">
                          <Phone className="size-3.5 mr-1.5" />
                          Call Parent
                        </Button>
                      </a>
                      {p.user.email && (
                        <a href={`mailto:${p.user.email}`} className="flex-1">
                          <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800 text-gray-300 h-9 text-xs">
                            <Mail className="size-3.5 mr-1.5" />
                            Email
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 text-gray-600 text-xs italic md:col-span-2">
                No parents or guardians linked to this student record.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
