"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  AwardIcon,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Play,
  Search,
  TrendingUp,
  Trophy,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ExportButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudentInfo {
  id: string;
  name: string;
  rollNumber: string | null;
  className: string;
  section: string;
  photo: string | null;
}

interface StudentCornerClientProps {
  students: StudentInfo[];
  activeStudentId: string;
  activeStudentName: string;
}

type TabType = "homework" | "materials" | "results" | "quizzes";

export default function StudentCornerClient({
  students,
  activeStudentId,
  activeStudentName,
}: StudentCornerClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("homework");
  const [selectedChildId, setSelectedChildId] = useState(activeStudentId);

  // Lists state
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<{ gpa: number; averagePercentage: number; results: any[] }>({
    gpa: 0,
    averagePercentage: 0,
    results: [],
  });
  const [quizzesList, setQuizzesList] = useState<any[]>([]);

  // Search/Filters state
  const [searchMaterial, setSearchMaterial] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("ALL");

  // Loading states
  const [loading, setLoading] = useState(true);

  // Fetch homework, materials, results, quizzes when active child changes
  useEffect(() => {
    const fetchCornerData = async () => {
      setLoading(true);
      try {
        const [hwRes, matRes, resRes, quizRes] = await Promise.all([
          fetch(`/api/parent/homework/${selectedChildId}`),
          fetch(`/api/parent/materials/${selectedChildId}`),
          fetch(`/api/parent/results/${selectedChildId}`),
          fetch(`/api/parent/quizzes/${selectedChildId}`),
        ]);

        if (!hwRes.ok || !matRes.ok || !resRes.ok || !quizRes.ok) {
          throw new Error("Failed to fetch Student Corner data");
        }

        const hw = await hwRes.json();
        const mat = await matRes.json();
        const res = await resRes.json();
        const quiz = await quizRes.json();

        setHomeworkList(hw);
        setMaterialsList(mat);
        setResultsData(res);

        // Enhance quiz list status using localStorage
        const enhancedQuizzes = quiz.map((q: any) => {
          const localRecord = localStorage.getItem(`quiz_sub_${selectedChildId}_${q.id}`);
          if (localRecord) {
            const parsed = JSON.parse(localRecord);
            return {
              ...q,
              status: "Completed",
              score: `${parsed.score}/${parsed.totalQuestions} - ${parsed.percentage}%`,
            };
          }
          return q;
        });
        setQuizzesList(enhancedQuizzes);
      } catch (err: any) {
        console.error(err);
        toast.error("Could not load study resources.");
      } finally {
        setLoading(false);
      }
    };

    fetchCornerData();
  }, [selectedChildId]);

  // Handle Child switcher change
  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
    // Write selection cookie
    document.cookie = `selected_child_id=${childId}; path=/; max-age=31536000; SameSite=Lax`;
    // Update path parameter triggers page reload for session alignment
    router.push(`/parent/student-corner?childId=${childId}`);
    router.refresh();
  };

  const activeStudentInfo = students.find((s) => s.id === selectedChildId) || students[0];

  const handleDownloadResults = async () => {
    if (!resultsData) return;
    const { exportReportCardPDF } = await import("@/lib/export/pdf-generator");
    exportReportCardPDF(
      {
        studentName: activeStudentInfo.name,
        className: `${activeStudentInfo.className} - ${activeStudentInfo.section}`,
        rollNumber: activeStudentInfo.rollNumber || "-",
        admissionNumber: activeStudentInfo.id,
        term: "Final Examination",
        academicYear: "2025-2026",
        subjects: resultsData.results.map((res: any) => ({
          subject: res.subject,
          obtainedMarks: res.obtainedMarks,
          totalMarks: res.totalMarks,
          percentage: res.percentage,
          grade: res.grade,
          remarks: res.remarks || "-",
        })),
        gpa: resultsData.gpa,
        averagePercentage: resultsData.averagePercentage,
        attendanceRate: 92,
        aiComment: "The student has demonstrated strong performance and consistent participation across core curriculum modules.",
        classTeacherName: "CLASS TUTOR SIGNATURE",
        principalName: "PRINCIPAL ACADEMIC OFFICE",
      },
      {
        name: "EduMind AI Academy",
        address: "Main Sector H-9, Islamabad",
      }
    );
  };

  // Helper for homework status badge
  const getHomeworkBadge = (status: string) => {
    switch (status) {
      case "Graded":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">Graded</Badge>;
      case "Submitted":
        return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">Submitted</Badge>;
      case "Not Submitted":
      default:
        return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 rounded">Not Submitted</Badge>;
    }
  };

  // Helper for results grade cards
  const getGradeBadge = (grade: string) => {
    switch (grade.toUpperCase()) {
      case "A+":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-950 text-green-300 border border-green-700/30">A+</span>;
      case "A":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/30">A</span>;
      case "B":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-950 text-blue-300 border border-blue-700/30">B</span>;
      case "C":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-700/30">C</span>;
      case "D":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-950 text-orange-300 border border-orange-700/30">D</span>;
      case "F":
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-300 border border-red-700/30">F</span>;
    }
  };

  // Get motivational message
  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 80) {
      return {
        text: "Excellent! Keep it up! 🌟",
        color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
      };
    }
    if (percentage >= 60) {
      return {
        text: "Good work! You can do better! 💪",
        color: "text-blue-400 bg-blue-500/5 border-blue-500/20",
      };
    }
    return {
      text: "Need more practice. Ask your teacher for help! 📚",
      color: "text-rose-400 bg-rose-500/5 border-rose-500/20",
    };
  };

  const motivation = getMotivationalMessage(resultsData.averagePercentage);

  // Homework due date countdown helper
  const getDueDateCountdown = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <span className="text-rose-400 font-semibold">Overdue ({Math.abs(diffDays)}d ago)</span>;
    if (diffDays === 0) return <span className="text-orange-400 font-semibold">Due today</span>;
    if (diffDays === 1) return <span className="text-yellow-400 font-semibold">Due tomorrow</span>;
    return <span className="text-gray-400">Due in {diffDays} days</span>;
  };

  // Filter study materials list
  const subjectsSet = new Set(materialsList.map((m) => m.subjectName));
  const uniqueSubjects = Array.from(subjectsSet);

  const filteredMaterials = materialsList.filter((mat) => {
    const matchesSearch = mat.title.toLowerCase().includes(searchMaterial.toLowerCase());
    const matchesFilter = selectedSubjectFilter === "ALL" || mat.subjectName === selectedSubjectFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Child Selector Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="size-8 text-blue-400" />
            Student Corner
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Learning materials, assignments workbook, quiz schedules, and exam results.
          </p>
        </div>

        {/* Multi-Child Selector Tabs */}
        {students.length > 1 && (
          <div className="flex bg-gray-900 border border-white/[0.06] p-1 rounded-xl shrink-0 gap-1">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleChildChange(student.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedChildId === student.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <User className="size-3.5" />
                {student.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Banner Notification ── */}
      <div className="border border-blue-500/20 bg-blue-950/20 backdrop-blur-xl rounded-xl p-4 flex items-center gap-3">
        <span className="text-xl">🎓</span>
        <p className="text-sm font-semibold text-blue-200">
          Student Corner — This section is for <strong className="text-white font-bold">{activeStudentName}</strong> to use for studying and homework
        </p>
      </div>

      {/* ── Tabs bar ── */}
      <div className="flex border-b border-white/[0.06] gap-6 overflow-x-auto scrollbar-none">
        {[
          { id: "homework", label: "My Homework", icon: BookOpen },
          { id: "materials", label: "Study Materials", icon: FileText },
          { id: "results", label: "My Results", icon: Award },
          { id: "quizzes", label: "Online Quizzes", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 relative transition-colors shrink-0 ${
                isActive ? "text-blue-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          );
        })}
      </div>

      {/* Loading state overlay */}
      {loading ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-12 text-center text-gray-500 text-sm">
          Loading learning modules...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── TAB 1: My Homework ── */}
          {activeTab === "homework" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {homeworkList.length === 0 ? (
                <Card className="col-span-2 border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-10 text-center rounded-xl">
                  <CheckCircle className="size-10 text-emerald-400 mx-auto mb-3 animate-bounce" />
                  <h3 className="text-white font-bold text-base">No Homework Scheduled</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    All clear! No assignments are currently scheduled for your class.
                  </p>
                </Card>
              ) : (
                homeworkList.map((hw) => (
                  <Card
                    key={hw.id}
                    className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl hover:border-white/[0.12] transition-all p-5 flex flex-col justify-between space-y-4 group relative overflow-hidden"
                  >
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/5 blur-xl rounded-full" />
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">
                            {hw.subjectName}
                          </span>
                          <span className="text-[10px] text-gray-500">Marks: {hw.totalMarks}</span>
                        </div>
                        {getHomeworkBadge(hw.status)}
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                        {hw.title}
                      </h3>

                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                        {hw.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {getDueDateCountdown(hw.dueDate)}
                        </span>
                        <span>•</span>
                        <span>Teacher: <strong>{hw.teacherName}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/parent/student-corner/assignment/${hw.id}?childId=${selectedChildId}`}
                        className="w-full inline-flex items-center justify-center text-xs font-semibold py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-500/10"
                      >
                        View & Submit
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ── TAB 2: Study Materials ── */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 bg-gray-900 border border-white/[0.06] p-4 rounded-xl">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchMaterial}
                    onChange={(e) => setSearchMaterial(e.target.value)}
                    placeholder="Search study materials by title..."
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Filter dropdown */}
                {uniqueSubjects.length > 0 && (
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="ALL">All Subjects</option>
                    {uniqueSubjects.map((subName: any) => (
                      <option key={subName} value={subName}>
                        {subName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Materials list */}
              {filteredMaterials.length === 0 ? (
                <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-10 text-center rounded-xl">
                  <AlertCircle className="size-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No study materials match your search parameters.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaterials.map((mat) => (
                    <Card
                      key={mat.id}
                      className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-between gap-4 hover:border-white/[0.1] transition-all"
                    >
                      <div className="min-w-0">
                        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[9px] uppercase px-1.5 py-0.2">
                          {mat.subjectName}
                        </Badge>
                        <h4 className="text-sm font-semibold text-white tracking-tight leading-tight mt-1 truncate">
                          {mat.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2.5 text-[10px] text-gray-500 mt-1">
                          <span>{mat.type}</span>
                          <span>•</span>
                          <span>Size: {mat.fileSize}</span>
                          <span>•</span>
                          <span>Uploaded: {new Date(mat.uploadDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <a
                        href={mat.downloadUrl}
                        download={mat.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
                        title="Download material"
                      >
                        <Download className="size-4" />
                      </a>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: My Results ── */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {/* Summary dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Cumulative GPA</p>
                  <p className="text-3xl font-extrabold text-white mt-2 leading-none flex items-baseline gap-1">
                    {resultsData.gpa.toFixed(2)}
                    <span className="text-xs text-gray-500 font-semibold">/ 4.00</span>
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 mt-3 self-start">
                    <TrendingUp className="size-3" />
                    Overall Academic Average
                  </div>
                </Card>

                <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase leading-none">Exam Percentage</p>
                  <p className="text-3xl font-extrabold text-white mt-2 leading-none">
                    {resultsData.averagePercentage}%
                  </p>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      style={{ width: `${resultsData.averagePercentage}%` }}
                    />
                  </div>
                </Card>

                {/* Motivational message card */}
                <Card className={`border rounded-xl p-4 flex items-center justify-center text-center ${motivation.color}`}>
                  <p className="text-sm font-bold leading-snug">{motivation.text}</p>
                </Card>
              </div>

              {/* Results table */}
              <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4">
                <CardHeader className="pb-3 pt-1 border-b border-white/[0.05] px-0 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-purple-400" />
                    <CardTitle className="text-sm font-semibold text-white">Transcripts & Report Sheets</CardTitle>
                  </div>
                  {resultsData?.results?.length > 0 && (
                    <ExportButton
                      data={resultsData.results}
                      type="pdf"
                      exportFunction={() => handleDownloadResults()}
                      className="h-8 text-xs border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-800"
                    />
                  )}
                </CardHeader>
                <div className="pt-4">
                  {resultsData.results.length === 0 ? (
                    <EmptyState
                      icon={Trophy}
                      title="No Results Yet"
                      description="Exam results will appear here"
                      actionLabel={null}
                      onAction={null}
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.05]">
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Exam</th>
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Obtained Marks</th>
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Percentage</th>
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                            <th className="pb-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="pb-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {resultsData.results.map((res) => (
                            <tr key={res.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-3 text-xs font-semibold text-white">{res.subject}</td>
                              <td className="py-3 text-xs text-gray-300">{res.examName}</td>
                              <td className="py-3 text-xs text-gray-400">
                                {res.obtainedMarks} <span className="text-[10px] text-gray-600">/ {res.totalMarks}</span>
                              </td>
                              <td className="py-3 text-xs font-semibold text-gray-300">{res.percentage}%</td>
                              <td className="py-3 text-xs">{getGradeBadge(res.grade)}</td>
                              <td className="py-3 text-xs text-gray-500">{res.date}</td>
                              <td className="py-3 text-xs text-gray-400 text-right max-w-[200px] truncate" title={res.remarks}>
                                {res.remarks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── TAB 4: Online Quizzes ── */}
          {activeTab === "quizzes" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {quizzesList.length === 0 ? (
                <Card className="col-span-2 border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl p-10 text-center rounded-xl">
                  <CheckCircle className="size-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-white font-bold text-base">No Quizzes Scheduled</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    There are currently no quizzes assigned to you.
                  </p>
                </Card>
              ) : (
                quizzesList.map((quiz) => {
                  const isCompleted = quiz.status === "Completed";
                  const isFuture = new Date(quiz.dueDate) > new Date();

                  return (
                    <Card
                      key={quiz.id}
                      className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-5 hover:border-white/[0.1] transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                    >
                      <div className="absolute -top-4 -right-4 w-12 h-12 bg-purple-500/5 blur-xl rounded-full" />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded">
                            {quiz.subjectName}
                          </span>
                          {isCompleted ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">Completed</Badge>
                          ) : isFuture ? (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">Not Taken</Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 rounded">Expired</Badge>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight leading-tight group-hover:text-purple-400 transition-colors">
                          {quiz.title}
                        </h3>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1.5 text-xs text-gray-400">
                          <div>Questions: <strong className="text-white">{quiz.questionsCount}</strong></div>
                          <div>Duration: <strong className="text-white">{quiz.timeLimit} mins</strong></div>
                          <div className="col-span-2 flex items-center gap-1 text-[11px] text-gray-500">
                            <Calendar className="size-3 text-gray-600" />
                            <span>Due: <strong>{new Date(quiz.dueDate).toLocaleDateString()}</strong></span>
                          </div>
                        </div>

                        {isCompleted && (
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center justify-between text-xs mt-1.5">
                            <span className="text-gray-400">Your Score:</span>
                            <strong className="text-emerald-400 font-extrabold text-sm">{quiz.score}</strong>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        {isCompleted ? (
                          <Link
                            href={`/parent/student-corner/quiz/${quiz.id}?childId=${selectedChildId}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
                          >
                            Review Quiz
                          </Link>
                        ) : isFuture ? (
                          <Link
                            href={`/parent/student-corner/quiz/${quiz.id}?childId=${selectedChildId}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-500/10"
                          >
                            <Play className="size-3 text-white fill-white" />
                            Start Quiz
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full inline-flex items-center justify-center text-xs font-semibold py-2 px-3 rounded-lg border border-white/[0.04] bg-white/[0.01] text-gray-600 cursor-not-allowed"
                          >
                            Quiz Expired
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
