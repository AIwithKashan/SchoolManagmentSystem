"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassAvg {
  id: string;
  className: string;
  averageScore: number;
  examsCount: number;
}

interface SubjectAvg {
  id: string;
  subjectName: string;
  averageScore: number;
  examsCount: number;
}

interface FinanceBreakdown {
  feeType: string;
  collected: number;
  pending: number;
  totalTarget: number;
  collectionRate: number;
}

interface ClassBalance {
  id: string;
  className: string;
  collected: number;
  pending: number;
}

interface AttendanceTrend {
  monthName: string;
  attendanceRate: number;
}

interface ReportsData {
  academics: {
    classAverages: ClassAvg[];
    subjectAverages: SubjectAvg[];
  };
  finances: {
    breakdown: FinanceBreakdown[];
    classBalances: ClassBalance[];
  };
  attendanceTrend: AttendanceTrend[];
}

const TYPE_LABELS: Record<string, string> = {
  TUITION: "Tuition Fee",
  TRANSPORT: "Transport Fee",
  LAB: "Lab Fee",
  SPORTS: "Sports Fee",
  OTHER: "Other Fee",
};

export default function ReportsAndAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"academics" | "attendance" | "finances">("academics");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);

  // ─── Format Currency ────────────────────────────────────────────────
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ─── API: Fetch Data ────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/principal/reports");
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to load report analytics");

      setData(resData);
    } catch (err: any) {
      toast.error(err.message || "Error building reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="size-8 text-indigo-400" />
            School Reports & Analytics
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Access structural reports, track class check-in trends, and audit school financial cashflow.
          </p>
        </div>
        <Button
          onClick={fetchReports}
          variant="outline"
          className="border-gray-800 bg-slate-900/40 text-gray-300 hover:bg-slate-800"
        >
          🔄 Re-Calculate
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-2 bg-slate-950/20 border border-gray-850 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("academics")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition",
            activeTab === "academics" ? "bg-indigo-650 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          Academic Performance
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition",
            activeTab === "attendance" ? "bg-blue-650 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          Attendance Trends
        </button>
        <button
          onClick={() => setActiveTab("finances")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition",
            activeTab === "finances" ? "bg-emerald-650 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          Financial Cashflow
        </button>
      </div>

      {/* Loading state */}
      {loading || !data ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="size-8 text-indigo-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium font-mono">Running SQL grouping operations...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Academics */}
          {activeTab === "academics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Class averages */}
              <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
                <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="size-4 text-yellow-400" />
                    Classroom Performance Indices
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850/50 bg-slate-950/50 font-semibold text-gray-450 uppercase">
                        <th className="p-3">Class</th>
                        <th className="p-3 text-center">Exams Conducted</th>
                        <th className="p-3 text-right">Average Class Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/30">
                      {data.academics.classAverages.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-gray-250">{cls.className}</td>
                          <td className="p-3 text-center text-gray-350">{cls.examsCount}</td>
                          <td className="p-3 text-right font-bold text-white">
                            <span className={cn(
                              "px-2 py-0.5 rounded font-mono",
                              cls.averageScore >= 80 ? "text-emerald-400" : cls.averageScore >= 50 ? "text-blue-400" : "text-red-400"
                            )}>
                              {cls.averageScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Subject averages */}
              <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
                <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="size-4 text-indigo-400" />
                    Subject Evaluation Indices
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850/50 bg-slate-950/50 font-semibold text-gray-450 uppercase">
                        <th className="p-3">Subject Name</th>
                        <th className="p-3 text-center">Evaluations</th>
                        <th className="p-3 text-right">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/30">
                      {data.academics.subjectAverages.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-gray-250">{sub.subjectName}</td>
                          <td className="p-3 text-center text-gray-350">{sub.examsCount}</td>
                          <td className="p-3 text-right font-bold text-white">
                            <span className={cn(
                              "px-2 py-0.5 rounded font-mono",
                              sub.averageScore >= 80 ? "text-emerald-400" : sub.averageScore >= 50 ? "text-blue-400" : "text-red-400"
                            )}>
                              {sub.averageScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Attendance */}
          {activeTab === "attendance" && (
            <Card className="glass-card border-gray-800 bg-slate-900/20 max-w-xl mx-auto overflow-hidden">
              <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-400" />
                  Monthly Attendance Trends
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-4">
                <div className="divide-y divide-gray-850/40 text-xs">
                  {data.attendanceTrend.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3">
                      <span className="font-semibold text-gray-300">{t.monthName}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-800 rounded-full h-1.5 hidden sm:block">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              t.attendanceRate >= 85 ? "bg-emerald-500" : "bg-red-500"
                            )}
                            style={{ width: `${t.attendanceRate}%` }}
                          ></div>
                        </div>
                        <span className={cn("font-bold text-sm font-mono", t.attendanceRate >= 85 ? "text-emerald-400" : "text-red-400")}>
                          {t.attendanceRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: Finances */}
          {activeTab === "finances" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
                <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-400" />
                    Billing Category Ledger
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850/50 bg-slate-950/50 font-semibold text-gray-455 uppercase">
                        <th className="p-3">Fee Type</th>
                        <th className="p-3 text-right">Collected</th>
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-right">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/30">
                      {data.finances.breakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-gray-250">{TYPE_LABELS[item.feeType]}</td>
                          <td className="p-3 text-right text-emerald-400 font-bold">{formatCurrency(item.collected)}</td>
                          <td className="p-3 text-right text-amber-400 font-bold">{formatCurrency(item.pending)}</td>
                          <td className="p-3 text-right">
                            <span className={cn("px-2 py-0.5 rounded font-mono font-bold", item.collectionRate >= 80 ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20")}>
                              {item.collectionRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Class Balances */}
              <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
                <CardHeader className="border-b border-gray-850/80 bg-slate-950/30">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="size-4 text-indigo-400" />
                    Class Balances Ledger
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850/50 bg-slate-950/50 font-semibold text-gray-455 uppercase">
                        <th className="p-3">Class</th>
                        <th className="p-3 text-right">Collected Amount</th>
                        <th className="p-3 text-right">Pending Amount</th>
                        <th className="p-3 text-center">Alert Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/30">
                      {data.finances.classBalances.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-gray-250">{cls.className}</td>
                          <td className="p-3 text-right text-emerald-400 font-bold">{formatCurrency(cls.collected)}</td>
                          <td className="p-3 text-right text-amber-400 font-bold">{formatCurrency(cls.pending)}</td>
                          <td className="p-3 text-center">
                            {cls.pending > 30000 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                                High Balance
                              </span>
                            ) : cls.pending > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Warning
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Clear
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
