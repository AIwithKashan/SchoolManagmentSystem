"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  Calendar,
  Clock,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Award,
  Sparkles,
  MapPin,
  FileText,
  DollarSign,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────
interface Attendance {
  id: string;
  date: string;
  status: string;
  note: string | null;
}

interface ClassSubject {
  id: string;
  class: {
    id: string;
    name: string;
    section: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface TeacherDetail {
  id: string;
  employeeId: string;
  qualification: string;
  specialization: string | null;
  joiningDate: string;
  salary: number | null;
  isClassTeacher: boolean;
  user: {
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    isActive: boolean;
  };
  managedClass: {
    id: string;
    name: string;
    section: string;
  } | null;
  classSubjects: ClassSubject[];
  attendances: Attendance[];
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const loadTeacher = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/principal/teachers/${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setTeacher(data.teacher ?? null);
      } else {
        toast.error("Teacher profile not found");
        router.push("/principal/teachers");
      }
    } catch {
      toast.error("Network error fetching teacher details");
    }
    setLoading(false);
  }, [teacherId, router]);

  useEffect(() => {
    if (teacherId) {
      loadTeacher();
    }
  }, [teacherId, loadTeacher]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-blue-500" />
        <p className="text-gray-500 text-sm">Loading teacher dossier records...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-20 text-gray-500 space-y-2 animate-fade-in">
        <p>No teacher record found</p>
        <Link href="/principal/teachers">
          <Button>Back to Workspace</Button>
        </Link>
      </div>
    );
  }

  // Attendance metrics
  const totalAtt = teacher.attendances.length;
  const presentCount = teacher.attendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const absentCount = teacher.attendances.filter(a => a.status === "ABSENT").length;
  const leaveCount = teacher.attendances.filter(a => a.status === "LEAVE").length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : null;

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header Link ── */}
      <div>
        <Link href="/principal/teachers">
          <Button variant="ghost" className="text-gray-400 hover:text-white pl-0 gap-1.5 h-8">
            <ArrowLeft className="size-4" />
            Back to Instructors list
          </Button>
        </Link>
      </div>

      {/* ── Profile header details ── */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
        <CardContent className="p-6 pt-12 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <div className="size-24 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border-2 border-purple-500/30 p-1 shrink-0 shadow-xl shadow-black/20">
            {teacher.user.avatar ? (
              <Image
                src={teacher.user.avatar}
                alt={teacher.user.name}
                width={96}
                height={96}
                className="size-full rounded-xl object-cover"
              />
            ) : (
              <InitialsAvatar name={teacher.user.name} size={96} className="size-full rounded-xl text-3xl" />
            )}
          </div>

          <div className="text-center md:text-left space-y-1.5 flex-1">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-wide">{teacher.user.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  teacher.user.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                <span className={cn("size-1.5 rounded-full", teacher.user.isActive ? "bg-emerald-400" : "bg-red-400")} />
                {teacher.user.isActive ? "Active Instructor" : "Inactive"}
              </span>
            </div>
            <p className="text-sm font-mono text-gray-500">
              Employee ID: <span className="text-gray-300 font-semibold">{teacher.employeeId}</span>
              {teacher.isClassTeacher && teacher.managedClass && ` · Class Teacher of ${teacher.managedClass.name}-${teacher.managedClass.section}`}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-2">
              <div className="bg-white/[0.02] border border-white/[0.06] text-gray-300 text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-blue-400" />
                <span>
                  Qualification: <strong>{teacher.qualification}</strong>
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] text-gray-300 text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-400" />
                <span>
                  Joined: <strong>{new Date(teacher.joiningDate).toLocaleDateString()}</strong>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs Navigation Menu ── */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto gap-2 pb-px scrollbar-none select-none">
        {[
          { id: "profile", label: "Profile Details", icon: User },
          { id: "classes", label: "Classes & Curriculum", icon: BookOpen },
          { id: "timetable", label: "Weekly Timetable", icon: Calendar },
          { id: "attendance", label: "Instructor Attendance", icon: Clock },
          { id: "performance", label: "Instructing Results", icon: TrendingUp },
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
                  ? "border-purple-500 text-purple-400 font-bold"
                  : "border-transparent text-gray-500 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TABS CONTENT ── */}
      <div className="space-y-6">
        {/* 1. PROFILE DETAILS TAB */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Bio Details */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl md:col-span-2">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Professional Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Instructor Full Name</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{teacher.user.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">System Email Address</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block font-mono">{teacher.user.email}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Phone Connection</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{teacher.user.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Current Qualification</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{teacher.qualification}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Specialization expertise</span>
                  <span className="text-white text-sm font-semibold mt-0.5 block">{teacher.specialization || "General Subjects"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Assigned Class Teacher Duty</span>
                  <span className="text-purple-400 text-sm font-bold mt-0.5 block">
                    {teacher.isClassTeacher && teacher.managedClass
                      ? `${teacher.managedClass.name} - ${teacher.managedClass.section}`
                      : "General Instructor"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Salary card */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl h-fit">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-400" />
                  Financial / Salary Band
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-center">
                {teacher.salary !== null ? (
                  <div className="py-4">
                    <span className="text-3xl font-black text-emerald-400 font-mono">
                      Rs. {teacher.salary.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Basic Monthly Compensation</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-600 text-xs italic">
                    Salary bands are currently unconfigured.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. CLASSES AND CURRICULUM TAB */}
        {activeTab === "classes" && (
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl animate-fade-in">
            <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Instructing Class Subjects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {teacher.classSubjects.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {teacher.classSubjects.map((cs) => (
                    <div key={cs.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01]">
                      <div>
                        <div className="text-sm font-semibold text-white tracking-wide">{cs.subject.name}</div>
                        <span className="text-[10px] text-gray-500 uppercase font-mono mt-0.5 block">Code: {cs.subject.code}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block">Class Section</span>
                        <span className="text-purple-300 font-bold">{cs.class.name} - {cs.class.section}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-600 text-xs italic">
                  No classroom subject schedules assigned to this instructor.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. TIMETABLE SCHEDULE TAB */}
        {activeTab === "timetable" && (
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-8 text-center space-y-3 animate-fade-in">
            <Calendar className="size-10 text-purple-400 mx-auto animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Schedule &amp; Timetables</h3>
            <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">
              Timetable planner features and automated schedule conflicts solvers are currently in construction 🗓️.
            </p>
          </Card>
        )}

        {/* 4. ATTENDANCE LOGS TAB */}
        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Quick metrics panel */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl h-fit">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-center">
                <div className="py-4 border-b border-white/[0.04]">
                  <span className="text-3xl font-black text-purple-400">
                    {attendanceRate !== null ? `${attendanceRate}%` : "No Logs"}
                  </span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Check-in Success Rate</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-bold">
                    {presentCount} Present
                  </div>
                  <div className="p-2 rounded bg-red-500/5 border border-red-500/10 text-red-400 font-bold">
                    {absentCount} Absent
                  </div>
                  <div className="p-2 rounded bg-yellow-500/5 border border-yellow-500/10 text-yellow-400 font-bold">
                    {leaveCount} Leaves
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Table */}
            <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl md:col-span-2">
              <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Check-in Logs (Last 30 Logs)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[360px] overflow-y-auto">
                {teacher.attendances.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {teacher.attendances.map((a) => (
                      <div key={a.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-gray-500 font-mono">
                            <Clock className="size-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{new Date(a.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            {a.note && <span className="text-[10px] text-gray-500 italic mt-0.5 block">Note: {a.note}</span>}
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
                    No active check-in history logs filed.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5. CLASS PERFORMANCE SUMMARY TAB */}
        {activeTab === "performance" && (
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl animate-fade-in">
            <CardHeader className="border-b border-white/[0.04] p-4 bg-white/[0.01]">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="size-4 text-purple-400" />
                Instructing Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-center">
              {/* Overall Grade Card */}
              <div className="max-w-sm mx-auto p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20 relative overflow-hidden">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Teaching Efficacy Index</span>
                <span className="text-4xl font-black text-purple-400">A+</span>
                <div className="text-xs text-gray-300 font-medium mt-2 flex items-center justify-center gap-1">
                  <Award className="size-4 text-yellow-400" />
                  Average Class Grade: <strong>89.6%</strong>
                </div>
              </div>

              {/* Sample detail list */}
              <div className="text-left max-w-lg mx-auto border border-gray-800 rounded-xl overflow-hidden divide-y divide-white/[0.04] text-xs">
                {[
                  { course: "Advanced Mathematics", section: "Grade 10-A", average: "91.2%", status: "Exceeding Target" },
                  { course: "Fundamentals of Chemistry", section: "Grade 9-B", average: "88.0%", status: "On Target" },
                ].map((item, index) => (
                  <div key={index} className="p-3.5 flex justify-between items-center hover:bg-white/[0.01] transition-colors">
                    <div>
                      <div className="font-semibold text-white">{item.course}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{item.section}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold block">{item.average}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mt-0.5">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
