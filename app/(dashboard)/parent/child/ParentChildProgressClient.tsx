"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  CreditCard,
  ClipboardList,
  GraduationCap,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Check,
  Search,
  MessageSquare,
  MapPin,
  Calendar,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface ChildInfo {
  id: string;
  name: string;
  rollNumber: string | null;
  className: string;
  section: string;
  photo: string | null;
  schoolName: string;
}

interface ParentChildProgressClientProps {
  students: ChildInfo[];
  activeStudentId: string;
  subjects: { id: string; name: string }[];
}

export default function ParentChildProgressClient({
  students,
  activeStudentId,
  subjects,
}: ParentChildProgressClientProps) {
  const router = useRouter();
  const [activeChildId, setActiveChildId] = useState(activeStudentId);
  const [activeTab, setActiveTab] = useState("overview");

  // Tab Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [assignmentsData, setAssignmentsData] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<any>(null);
  const [timetableData, setTimetableData] = useState<any>(null);

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Assignment Filters state
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Expandable feedbacks map
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Record<string, boolean>>({});

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch student info
  const activeStudent = students.find((s) => s.id === activeChildId) || students[0];

  const handleChildSelect = (childId: string) => {
    setActiveChildId(childId);
    document.cookie = `selected_child_id=${childId}; path=/; max-age=31536000`; // 1 year
    router.push(`/parent/child?childId=${childId}`);
  };

  // API Call dispatchers
  const fetchOverview = async (studentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/child/${studentId}/overview`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOverviewData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load overview statistics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (studentId: string, monthNum: number, yearNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/child/${studentId}/attendance?month=${monthNum}&year=${yearNum}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttendanceData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (studentId: string, subId?: string, statusText?: string) => {
    setLoading(true);
    try {
      let url = `/api/parent/child/${studentId}/assignments`;
      const queryParams = [];
      if (subId && subId !== "all") queryParams.push(`subjectId=${subId}`);
      if (statusText && statusText !== "all") queryParams.push(`status=${statusText}`);
      if (queryParams.length > 0) url += `?${queryParams.join("&")}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssignmentsData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load homework assignments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (studentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/child/${studentId}/results`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultsData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load exam scorecards.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (studentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/child/${studentId}/timetable`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTimetableData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load timetable.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger load based on tab switches
  useEffect(() => {
    if (!activeChildId) return;

    if (activeTab === "overview") {
      fetchOverview(activeChildId);
    } else if (activeTab === "attendance") {
      fetchAttendance(activeChildId, currentMonth, currentYear);
    } else if (activeTab === "assignments") {
      fetchAssignments(activeChildId, filterSubject, filterStatus);
    } else if (activeTab === "results") {
      fetchResults(activeChildId);
    } else if (activeTab === "timetable") {
      fetchTimetable(activeChildId);
    }
  }, [activeChildId, activeTab, currentMonth, currentYear]);

  // Handle assignment filter updates
  const handleFilterChange = (sub: string, stat: string) => {
    setFilterSubject(sub);
    setFilterStatus(stat);
    fetchAssignments(activeChildId, sub, stat);
  };

  // Navigating months
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Download Action triggers
  const handleDownloadAttendanceReport = () => {
    toast.success("Compiling attendance record history... PDF generation starting.");
  };

  const handleDownloadReportCard = (term: string) => {
    toast.success(`Downloading high-fidelity report card PDF sheet for ${term}.`);
  };

  // Toggle comments
  const toggleFeedback = (id: string) => {
    setExpandedFeedbacks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Initials generator
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date(2000, monthNumber - 1, 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  // Build calendar elements
  const renderCalendar = () => {
    if (!attendanceData) return null;
    const { calendarDays } = attendanceData;
    
    // Pad first week depending on day index
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
    const paddingCellsCount = (firstDayOfWeek + 6) % 7; // Monday first column index
    
    const cells: React.ReactNode[] = [];

    // Empty padding cells
    for (let i = 0; i < paddingCellsCount; i++) {
      cells.push(<div key={`pad-${i}`} className="aspect-square bg-white/[0.01] border border-white/[0.03] rounded-lg" />);
    }

    // Actual calendar cells
    calendarDays.forEach((cd: any) => {
      let bgStyle = "bg-slate-900 border-white/[0.06] text-white"; // default white
      let badgeLabel = "";

      if (cd.status === "PRESENT") bgStyle = "bg-emerald-600/20 border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-600/30";
      if (cd.status === "ABSENT") bgStyle = "bg-rose-600/20 border-rose-500/30 text-rose-400 font-bold hover:bg-rose-600/30";
      if (cd.status === "LATE") bgStyle = "bg-amber-600/20 border-amber-500/30 text-amber-400 font-bold hover:bg-amber-600/30";
      if (cd.status === "LEAVE") bgStyle = "bg-blue-600/20 border-blue-500/30 text-blue-400 font-bold hover:bg-blue-600/30";
      if (cd.status === "WEEKEND") bgStyle = "bg-white/[0.02] border-white/[0.04] text-gray-500 cursor-not-allowed";
      if (cd.status === "FUTURE") bgStyle = "bg-white/[0.01] border-dashed border-white/[0.06] text-gray-600 cursor-not-allowed";

      cells.push(
        <div
          key={`day-${cd.day}`}
          className={`aspect-square border rounded-lg flex flex-col items-center justify-center relative p-1.5 transition-all text-xs cursor-default ${bgStyle}`}
          title={cd.status !== "FUTURE" ? `Status: ${cd.status}` : "Future school day"}
        >
          <span>{cd.day}</span>
          {cd.status === "LATE" && <span className="absolute bottom-1 text-[8px] bg-amber-500/20 px-1 rounded-sm text-amber-300 font-medium">L</span>}
          {cd.status === "LEAVE" && <span className="absolute bottom-1 text-[8px] bg-blue-500/20 px-1 rounded-sm text-blue-300 font-medium">L</span>}
          {cd.status === "ABSENT" && <span className="absolute bottom-1 text-[8px] bg-rose-500/20 px-1 rounded-sm text-rose-300 font-medium">A</span>}
        </div>
      );
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Header section with switch child logic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Academic Performance
          </h2>
          <p className="text-muted-foreground mt-1">Detailed metrics, grades, and schedules for your child</p>
        </div>

        {/* Student select switches */}
        {students.length > 1 && (
          <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] p-1.5 rounded-xl self-start md:self-center">
            {students.map((stud) => (
              <button
                key={stud.id}
                onClick={() => handleChildSelect(stud.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChildId === stud.id
                    ? "bg-violet-600 text-white shadow-md border border-violet-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <GraduationCap className="size-3.5" />
                {stud.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Student contextual banner details */}
      {activeStudent && (
        <Card className="glass-card border-white/[0.06] bg-white/[0.01] backdrop-blur-xl rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            {activeStudent.photo ? (
              <Image
                src={activeStudent.photo}
                alt={activeStudent.name}
                width={48}
                height={48}
                className="size-12 rounded-xl object-cover ring-2 ring-violet-500/20 shadow"
              />
            ) : (
              <InitialsAvatar name={activeStudent.name} size={48} className="size-12" />
            )}
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{activeStudent.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Class: {activeStudent.className} - {activeStudent.section}  •  Roll Number: #{activeStudent.rollNumber || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-white/[0.05]">
            <MapPin className="size-3.5 text-violet-400 shrink-0" />
            <span>Campus: {activeStudent.schoolName}</span>
          </div>
        </Card>
      )}

      {/* Tabs section container */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2 hover:text-white transition-all text-gray-400">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2 hover:text-white transition-all text-gray-400">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2 hover:text-white transition-all text-gray-400">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2 hover:text-white transition-all text-gray-400">
            Exam Results
          </TabsTrigger>
          <TabsTrigger value="timetable" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg text-xs font-semibold px-4 py-2 hover:text-white transition-all text-gray-400">
            Timetable
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <span className="size-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Loading child academic profile...</p>
          </div>
        ) : (
          <>
            {/* ──── TAB 1: OVERVIEW ──── */}
            <TabsContent value="overview" className="space-y-6">
              {overviewData && (
                <>
                  {/* Overview statistics grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                        <TrendingUp className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Average Score</p>
                        <p className="text-2xl font-extrabold text-white mt-0.5">{overviewData.summary.overallPercentage}%</p>
                      </div>
                    </Card>

                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                        <Award className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Class Rank</p>
                        <p className="text-xl font-extrabold text-white mt-0.5">{overviewData.summary.classRank}</p>
                      </div>
                    </Card>

                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <CheckCircle2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Best Subject</p>
                        <p className="text-lg font-bold text-white mt-0.5 truncate max-w-[140px]">{overviewData.summary.bestSubject}</p>
                      </div>
                    </Card>

                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                        <AlertCircle className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Needs Attention</p>
                        <p className="text-lg font-bold text-white mt-0.5 truncate max-w-[140px]">{overviewData.summary.needsAttention}</p>
                      </div>
                    </Card>
                  </div>

                  {/* Teacher's general remark comment */}
                  <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex gap-4">
                      <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 h-fit shrink-0">
                        <MessageSquare className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Class Teacher Remarks ({overviewData.summary.classTeacherName})
                        </h4>
                        <p className="text-sm text-gray-300 italic font-medium leading-relaxed mt-1">
                          &ldquo;{overviewData.summary.teacherComment}&rdquo;
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Two column breakdown: subjects list and trend chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Grid of subjects (60%) */}
                    <div className="lg:col-span-3 space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <GraduationCap className="size-4.5 text-violet-400" />
                        <span>Subject Performance Breakdown</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {overviewData.subjectAverages.map((sub: any) => (
                          <Card key={sub.id} className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-4 flex flex-col justify-between hover:border-white/[0.15] transition-all">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-bold text-white text-sm">{sub.subjectName}</h4>
                                <p className="text-[10px] text-gray-500 mt-0.5">Teacher: {sub.teacherName}</p>
                              </div>
                              <span className={`text-xs ${sub.trend === "up" ? "text-emerald-400" : sub.trend === "down" ? "text-rose-400" : "text-gray-400"}`}>
                                {sub.trend === "up" ? "↑" : sub.trend === "down" ? "↓" : "→"}
                              </span>
                            </div>

                            <div className="space-y-2 mt-4">
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-gray-500">Term Average</span>
                                <span className="text-lg font-extrabold text-white">{sub.average}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    sub.average >= 85 ? "bg-emerald-500" : sub.average >= 70 ? "bg-blue-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${sub.average}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-gray-500 flex justify-between">
                                <span>Last test: {sub.lastMark}%</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Recharts chart trend (40%) */}
                    <Card className="lg:col-span-2 glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex flex-col justify-between">
                      <div className="space-y-1 mb-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <TrendingUp className="size-4.5 text-violet-400" />
                          <span>Progress Analysis</span>
                        </h3>
                        <p className="text-xs text-gray-500">Timeline performance results across evaluations</p>
                      </div>

                      <div className="h-64 w-full text-xs">
                        {isMounted && overviewData.chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={overviewData.chartData} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="#888888" tickLine={false} />
                              <YAxis stroke="#888888" tickLine={false} domain={[40, 100]} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(15,23,42,0.9)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "12px",
                                }}
                              />
                              <Legend wrapperStyle={{ paddingTop: "10px" }} />
                              {Object.keys(overviewData.chartData[0])
                                .filter((k) => k !== "name")
                                .map((subjectKey, idx) => {
                                  const colors = ["#8B5CF6", "#10B981", "#3B82F6", "#F43F5E", "#F59E0B"];
                                  return (
                                    <Line
                                      key={subjectKey}
                                      type="monotone"
                                      dataKey={subjectKey}
                                      stroke={colors[idx % colors.length]}
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 5 }}
                                    />
                                  );
                                })}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center italic text-gray-500">
                            No trend data points.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ──── TAB 2: ATTENDANCE ──── */}
            <TabsContent value="attendance" className="space-y-6">
              {attendanceData && (
                <>
                  {/* Attendance Counters grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Days</p>
                      <p className="text-2xl font-extrabold text-white mt-1">{attendanceData.summary.totalSchoolDays}</p>
                    </Card>
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Present</p>
                      <p className="text-2xl font-extrabold text-emerald-400 mt-1">{attendanceData.summary.present}</p>
                    </Card>
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Absent</p>
                      <p className="text-2xl font-extrabold text-rose-400 mt-1">{attendanceData.summary.absent}</p>
                    </Card>
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Late</p>
                      <p className="text-2xl font-extrabold text-amber-400 mt-1">{attendanceData.summary.late}</p>
                    </Card>
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Leave</p>
                      <p className="text-2xl font-extrabold text-blue-400 mt-1">{attendanceData.summary.leave}</p>
                    </Card>
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 text-center">
                      <p className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Percentage</p>
                      <p className="text-2xl font-extrabold text-violet-400 mt-1">{attendanceData.summary.percentage}%</p>
                    </Card>
                  </div>

                  {/* Attendance calendar view section */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Calendar grid (60%) */}
                    <Card className="lg:col-span-3 glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-4">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={handlePrevMonth} className="size-8 rounded-lg border-white/[0.08] hover:bg-white/[0.05]">
                            <ChevronLeft className="size-4" />
                          </Button>
                          <h3 className="text-base font-bold text-white min-w-[140px] text-center">
                            {getMonthName(currentMonth)} {currentYear}
                          </h3>
                          <Button size="icon" variant="outline" onClick={handleNextMonth} className="size-8 rounded-lg border-white/[0.08] hover:bg-white/[0.05]">
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>

                        <Button size="sm" onClick={handleDownloadAttendanceReport} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-md text-xs">
                          <Download className="size-3.5" />
                          Download Report
                        </Button>
                      </div>

                      {renderCalendar()}

                      {/* Color badges codes */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 justify-center text-[10px] font-medium text-gray-500 border-t border-white/[0.06] pt-4">
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" />Present</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-rose-500/20 border border-rose-500/30" />Absent</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-amber-500/20 border border-amber-500/30" />Late</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-blue-500/20 border border-blue-500/30" />Leave</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-white/[0.02] border border-white/[0.06]" />Weekend</span>
                      </div>
                    </Card>

                    {/* Absence details tables log (40%) */}
                    <Card className="lg:col-span-2 glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex flex-col justify-between">
                      <div className="space-y-1 mb-4 pb-3 border-b border-white/[0.06]">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <AlertCircle className="size-4.5 text-rose-400" />
                          <span>Absence & Excuse Log</span>
                        </h3>
                        <p className="text-xs text-gray-500">Chronological history of absences, lates, and leaves</p>
                      </div>

                      <div className="grow overflow-y-auto max-h-[300px] space-y-3 pr-1">
                        {attendanceData.absencesLog.length > 0 ? (
                          attendanceData.absencesLog.map((log: any) => {
                            let typeColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                            if (log.status === "LATE") typeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                            if (log.status === "LEAVE") typeColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";

                            return (
                              <div key={log.id} className="p-3 border border-white/[0.05] bg-white/[0.01] rounded-xl space-y-1.5 hover:bg-white/[0.02] transition-colors">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400">{log.dateString} ({log.dayName})</span>
                                  <Badge className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider ${typeColor}`}>
                                    {log.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-300 leading-snug">{log.note}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-2">
                            <span className="text-3xl">🎉</span>
                            <p className="text-xs text-gray-500 italic">No recorded absences, leaves, or lates this month!</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ──── TAB 3: ASSIGNMENTS ──── */}
            <TabsContent value="assignments" className="space-y-6">
              {/* Filters row bar */}
              <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow">
                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Filter className="size-4 text-violet-400" />
                    <span>Filter Sheets</span>
                  </div>

                  {/* Subject Filter dropdown select */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="subSelect" className="text-xs text-gray-500">Subject:</label>
                    <select
                      id="subSelect"
                      value={filterSubject}
                      onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
                      className="bg-slate-900 text-xs text-white border border-white/[0.08] px-3 py-1.5 rounded-lg focus:outline-none focus:border-violet-500"
                    >
                      <option value="all">All Subjects</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter dropdown select */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="statSelect" className="text-xs text-gray-500">Status:</label>
                    <select
                      id="statSelect"
                      value={filterStatus}
                      onChange={(e) => handleFilterChange(filterSubject, e.target.value)}
                      className="bg-slate-900 text-xs text-white border border-white/[0.08] px-3 py-1.5 rounded-lg focus:outline-none focus:border-violet-500"
                    >
                      <option value="all">All Status</option>
                      <option value="Pending">Not Submitted</option>
                      <option value="Submitted">Submitted (Pending evaluation)</option>
                      <option value="Graded">Graded</option>
                    </select>
                  </div>
                </div>
                
                <span className="text-xs text-gray-500 font-semibold">{assignmentsData.length} assignment{assignmentsData.length !== 1 ? "s" : ""} found</span>
              </Card>

              {/* Grid of assignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignmentsData.length > 0 ? (
                  assignmentsData.map((assign) => {
                    let statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    if (assign.status === "Submitted") statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    if (assign.status === "Graded") statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                    const isExpanded = !!expandedFeedbacks[assign.id];

                    return (
                      <Card key={assign.id} className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-white/[0.12] transition-all">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                              {assign.subjectName}
                            </Badge>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded ${statusColor}`}>
                              {assign.status === "Graded" ? `Graded: ${assign.marksString}` : assign.status}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white leading-snug">{assign.title}</h3>
                          <p className="text-xs text-gray-400 leading-relaxed truncate-2-lines">{assign.description}</p>
                        </div>

                        <div className="border-t border-white/[0.06] pt-3 mt-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2 text-gray-500">
                            <span>Total Marks: <strong className="text-gray-300">{assign.totalMarks}</strong></span>
                            <span className={assign.isPastDue && assign.status === "Not Submitted" ? "text-rose-400 font-semibold" : ""}>
                              Due Date: {new Date(assign.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Expandable teacher feedback block */}
                          {assign.status === "Graded" && assign.feedback && (
                            <div className="border border-white/[0.05] bg-white/[0.01] rounded-xl overflow-hidden transition-all">
                              <button
                                onClick={() => toggleFeedback(assign.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-colors"
                              >
                                <span className="flex items-center gap-1"><MessageSquare className="size-3.5" /> Teacher Feedback</span>
                                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                              </button>
                              {isExpanded && (
                                <p className="px-3 pb-3 pt-0.5 text-xs text-gray-300 italic leading-relaxed border-t border-white/[0.03]">
                                  &ldquo;{assign.feedback}&rdquo;
                                </p>
                              )}
                            </div>
                          )}

                          {assign.status === "Not Submitted" && (
                            <Button
                              onClick={() => {
                                toast.info("Redirecting to Student assignment submission wizard...");
                              }}
                              className="w-full bg-white/[0.03] border border-white/[0.08] hover:bg-violet-600 hover:text-white transition-all text-xs text-violet-300 font-semibold rounded-xl h-9"
                            >
                              Submit Now
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-16 text-center">
                    <p className="text-sm text-gray-500 italic">No homework assignments match the selected filters.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ──── TAB 4: EXAM RESULTS ──── */}
            <TabsContent value="results" className="space-y-6">
              {resultsData && (
                <>
                  {/* Results Summary Cockpit Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex items-center gap-3.5">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <Check className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Best Exam Scored</p>
                        <p className="text-xs font-bold text-white truncate max-w-[200px] mt-0.5">{resultsData.summary.bestResult}</p>
                      </div>
                    </Card>

                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex items-center gap-3.5">
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                        <XCircle className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Lowest Exam Scored</p>
                        <p className="text-xs font-bold text-white truncate max-w-[200px] mt-0.5">{resultsData.summary.worstResult}</p>
                      </div>
                    </Card>

                    <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex items-center gap-3.5">
                      <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
                        <Award className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Exam Average Rate</p>
                        <p className="text-base font-extrabold text-white mt-0.5">{resultsData.summary.averagePercentage}% (B Grade)</p>
                      </div>
                    </Card>
                  </div>

                  {/* Exam table results sheet */}
                  <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 overflow-hidden">
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                      <FileText className="size-4.5 text-violet-400" />
                      <span>Exam Results Sheet Ledger</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="border-b border-white/[0.08]">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Evaluation / Exam</TableHead>
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Subject</TableHead>
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Marks Scored</TableHead>
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Grade Letter</TableHead>
                            <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Instructor Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultsData.resultsTable.map((row: any) => {
                            let gradeBadgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            if (row.grade === "A") gradeBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                            if (row.grade === "B" || row.grade === "C") gradeBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                            if (row.grade === "D") gradeBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";

                            return (
                              <TableRow key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                                <TableCell className="font-bold text-white text-xs">{row.examTitle}</TableCell>
                                <TableCell className="text-gray-300 text-xs">{row.subjectName}</TableCell>
                                <TableCell className="text-gray-400 text-xs">{row.dateString}</TableCell>
                                <TableCell className="text-gray-300 font-bold text-xs">{row.marksString} ({row.percentage}%)</TableCell>
                                <TableCell>
                                  <Badge className={`px-2 py-0.5 text-xs font-bold border rounded-md ${gradeBadgeColor}`}>
                                    {row.grade}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-400 italic text-xs truncate max-w-[200px]" title={row.remarks}>
                                  {row.remarks}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>

                  {/* Report Card section */}
                  <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                      <FileText className="size-4.5 text-violet-400" />
                      <span>Term Digital Report Cards</span>
                    </h3>
                    <div className="space-y-3">
                      {resultsData.reportCards.map((rc: any) => (
                        <div key={rc.id} className="p-4 border border-white/[0.06] bg-white/[0.01] rounded-xl flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white leading-tight">{rc.termName}</h4>
                            <p className="text-[10px] text-gray-500">Released date: {new Date(rc.issueDate).toLocaleDateString()}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadReportCard(rc.termName)}
                            className="bg-white/[0.03] border border-white/[0.08] hover:bg-violet-600 hover:text-white transition-all text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
                          >
                            <Download className="size-3.5" />
                            Download Report Card
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ──── TAB 5: TIMETABLE ──── */}
            <TabsContent value="timetable" className="space-y-6">
              {timetableData && (
                <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Calendar className="size-4.5 text-violet-400" />
                        <span>Weekly Academic Timetable Schedule</span>
                      </h3>
                      <p className="text-xs text-gray-500">Period schedule mapped with assigned class subjects</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-white/[0.03] border border-white/[0.08] hover:bg-violet-600 hover:text-white transition-all text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow shrink-0"
                    >
                      <Printer className="size-3.5" />
                      Print Timetable
                    </Button>
                  </div>

                  {/* Timetable schedule grid */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] border border-white/[0.06] rounded-xl overflow-hidden">
                      {/* Hours Columns Headers */}
                      <div className="grid grid-cols-6 bg-slate-950/60 border-b border-white/[0.08]">
                        <div className="p-3.5 text-center text-xs font-bold text-gray-400 border-r border-white/[0.06]">Period</div>
                        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => {
                          const todayDayString = new Date().toLocaleDateString("en-US", { weekday: "short" });
                          const isToday = todayDayString === d;

                          return (
                            <div
                              key={d}
                              className={`p-3.5 text-center text-xs font-bold border-r border-white/[0.06] last:border-r-0 ${
                                isToday ? "bg-violet-600/20 text-violet-400 font-extrabold" : "text-gray-400"
                              }`}
                            >
                              {d} {isToday && "(Today)"}
                            </div>
                          );
                        })}
                      </div>

                      {/* Schedule Periods rows */}
                      {timetableData.timetable[0].periods.map((p: any, pIdx: number) => {
                        return (
                          <div key={p.periodNumber} className="grid grid-cols-6 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.01] transition-colors">
                            {/* Period Time details */}
                            <div className="p-3.5 flex flex-col items-center justify-center text-center bg-slate-900/40 border-r border-white/[0.06]">
                              <span className="text-xs font-bold text-violet-400">Period {p.periodNumber}</span>
                              <span className="text-[9px] text-gray-500 mt-1">{p.timeString}</span>
                            </div>

                            {/* Subjects cell columns per day */}
                            {timetableData.timetable.map((dayData: any) => {
                              const cellPeriod = dayData.periods[pIdx];
                              const todayDayString = new Date().toLocaleDateString("en-US", { weekday: "long" });
                              const isToday = todayDayString === dayData.day;

                              return (
                                <div
                                  key={dayData.day}
                                  className={`p-3.5 flex flex-col justify-center items-center text-center border-r border-white/[0.06] last:border-r-0 ${
                                    isToday ? "bg-violet-500/[0.02]" : ""
                                  }`}
                                >
                                  <span className="text-xs font-bold text-white leading-snug truncate max-w-[120px]">{cellPeriod.subjectName}</span>
                                  <span className="text-[9px] text-gray-500 mt-1 truncate max-w-[120px]">{cellPeriod.teacherName}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Recess Break interval block */}
                      <div className="bg-slate-900/20 py-2.5 px-4 text-center text-[10px] font-bold text-gray-500 border-t border-b border-white/[0.06]">
                        🍔 {timetableData.breakPeriod.label} ({timetableData.breakPeriod.timeString})
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
