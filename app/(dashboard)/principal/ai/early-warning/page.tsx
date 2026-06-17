'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  AlertTriangle,
  RotateCcw,
  User,
  CheckCircle,
  XCircle,
  TrendingDown,
  UserCheck,
  Compass,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Search,
} from 'lucide-react';

interface RiskReport {
  studentId: string;
  studentName: string;
  className: string;
  photo: string | null;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  metrics: {
    attendanceThisMonth: number;
    attendanceLastMonth: number;
    attendanceTrend: 'improving' | 'declining' | 'stable';
    averageGrade: number;
    gradeTrend: 'improving' | 'declining' | 'stable';
    submissionRate: number;
    failedExamsCount: number;
    daysSinceLastSubmission: number;
  };
  aiAnalysis?: {
    primaryRiskFactors: string[];
    likelyRootCause: string;
    recommendedIntervention: string[];
    actionTakenBy: string;
    timeline: string;
  };
  isReviewed?: boolean;
}

export default function EarlyWarningPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId || 'school-id';

  // 1. Data states
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [summary, setSummary] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Just now');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>(Date.now());

  // 2. Filter states
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. UI states
  const [expandedAI, setExpandedAI] = useState<Record<string, boolean>>({});
  const [localReviewedList, setLocalReviewedList] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  // Set up timer string
  useEffect(() => {
    const interval = setInterval(() => {
      const diffMins = Math.floor((Date.now() - lastUpdatedTime) / 60000);
      if (diffMins === 0) {
        setLastUpdatedText('Just now');
      } else {
        setLastUpdatedText(`${diffMins} minute${diffMins > 1 ? 's' : ''} ago`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime]);

  const fetchData = async (refresh: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/early-warning?schoolId=${schoolId}${refresh ? '&refresh=true' : ''}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
        setSummary(data.summary);
        setLastUpdatedTime(data.lastUpdated);
        setLastUpdatedText('Just now');

        // Capture initially reviewed items from server
        const initialReviewed = new Set<string>();
        data.reports.forEach((rep: RiskReport) => {
          if (rep.isReviewed) {
            initialReviewed.add(rep.studentId);
          }
        });
        setLocalReviewedList(initialReviewed);
      } else {
        toast.error('Failed to load risk warnings reports.');
      }
    } catch (err) {
      console.error('Failed to load risk stats:', err);
      toast.error('Failed to communicate with risk warnings API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (actionType: string, studentId: string) => {
    setActionInProgress((prev) => ({ ...prev, [`${studentId}_${actionType}`]: 'running' }));
    try {
      const res = await fetch('/api/ai/early-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          studentId,
          schoolId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Action executed successfully!');
        if (actionType === 'MARK_REVIEWED') {
          const updated = new Set(localReviewedList);
          updated.add(studentId);
          setLocalReviewedList(updated);
        }
      } else {
        throw new Error(data.error || 'Server rejected request');
      }
    } catch (err) {
      toast.error(`Action failed: ${(err as Error).message}`);
    } finally {
      setActionInProgress((prev) => ({ ...prev, [`${studentId}_${actionType}`]: null }));
    }
  };

  const toggleAI = (studentId: string) => {
    setExpandedAI((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  // Filter logic
  const classesList = Array.from(new Set(reports.map((r) => r.className))).filter(Boolean);

  const filteredReports = reports.filter((r) => {
    const isReviewed = localReviewedList.has(r.studentId);
    
    // Search filter
    if (searchQuery && !r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Class filter
    if (classFilter !== 'ALL' && r.className !== classFilter) {
      return false;
    }
    // Risk Level filter
    if (riskFilter !== 'ALL' && r.riskLevel !== riskFilter) {
      return false;
    }

    return true;
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500 border-red-500/30 bg-red-500/10';
      case 'HIGH':
        return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'MEDIUM':
        return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-650 text-red-100 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-orange-650 text-orange-100 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-650 text-amber-100 border-amber-500/40';
      default:
        return 'bg-emerald-650 text-emerald-100 border-emerald-500/40';
    }
  };

  const activeCriticalCount = filteredReports.filter((r) => r.riskLevel === 'CRITICAL' && !localReviewedList.has(r.studentId)).length;
  const activeHighCount = filteredReports.filter((r) => r.riskLevel === 'HIGH' && !localReviewedList.has(r.studentId)).length;
  const activeMediumCount = filteredReports.filter((r) => r.riskLevel === 'MEDIUM' && !localReviewedList.has(r.studentId)).length;
  const activeLowCount = filteredReports.filter((r) => r.riskLevel === 'LOW' && !localReviewedList.has(r.studentId)).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 space-y-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-950/5 blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            🚨 Early Warning System
          </h1>
          <p className="text-xs text-slate-400">
            Powered by EduMind AI — Updated {lastUpdatedText}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isLoading}
          className="self-start sm:self-auto py-2 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-slate-100 flex items-center gap-1.5 transition-all text-xs font-semibold shadow-md"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          Refresh Calculations
        </button>
      </div>

      {/* SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative">
        {/* Critical Card */}
        <div className="bg-slate-900/40 border border-red-500/20 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-[-20%] right-[-20%] w-16 h-16 rounded-full bg-red-500/5 blur-md" />
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-1">Critical Risk</span>
          <strong className="text-red-500 text-3xl font-black animate-pulse">{activeCriticalCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1">Urgent intervention required</span>
        </div>

        {/* High Card */}
        <div className="bg-slate-900/40 border border-orange-500/20 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-[-20%] right-[-20%] w-16 h-16 rounded-full bg-orange-500/5 blur-md" />
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block mb-1">High Risk</span>
          <strong className="text-orange-500 text-3xl font-black">{activeHighCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1">Requires immediate attention</span>
        </div>

        {/* Medium Card */}
        <div className="bg-slate-900/40 border border-amber-500/20 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-[-20%] right-[-20%] w-16 h-16 rounded-full bg-amber-500/5 blur-md" />
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">Medium Risk</span>
          <strong className="text-amber-500 text-3xl font-black">{activeMediumCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1">Academic monitoring</span>
        </div>

        {/* Low Card */}
        <div className="bg-slate-900/40 border border-emerald-500/20 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-[-20%] right-[-20%] w-16 h-16 rounded-full bg-emerald-500/5 blur-md" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">On Track</span>
          <strong className="text-emerald-500 text-3xl font-black">{activeLowCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1">Performing satisfactorily</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-900/30 border border-slate-900 p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 relative backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-200"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-200"
            >
              <option value="ALL">All Classes</option>
              {classesList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 flex items-center text-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-550 w-full"
          />
        </div>
      </div>

      {/* STUDENT CARDS LIST */}
      <div className="space-y-4 z-10 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-450 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            Evaluating student metrics and generating AI psychologies...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 text-slate-500 italic text-xs bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl">
            No student flags match selected filters.
          </div>
        ) : (
          filteredReports.map((report) => {
            const isReviewed = localReviewedList.has(report.studentId);
            const isCritical = report.riskLevel === 'CRITICAL';
            const isHigh = report.riskLevel === 'HIGH';
            const isAIExpanded = expandedAI[report.studentId] || false;

            return (
              <div
                key={report.studentId}
                className={`rounded-3xl border transition-all shadow-md overflow-hidden ${
                  isReviewed
                    ? 'opacity-40 bg-slate-950/20 border-slate-950'
                    : isCritical
                    ? 'border-red-500/20 bg-slate-900/30'
                    : isHigh
                    ? 'border-orange-500/20 bg-slate-900/30'
                    : 'border-slate-900 bg-slate-900/20'
                }`}
              >
                {/* Main Card Body */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Student Avatar */}
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 flex-shrink-0 relative overflow-hidden">
                      {report.photo ? (
                        <Image src={report.photo} alt={report.studentName} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <User className="w-5 h-5 text-slate-450" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-250 leading-none">{report.studentName}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getRiskBadgeColor(report.riskLevel)}`}>
                          {report.riskLevel}
                        </span>
                        {isReviewed && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">{report.className}</p>

                      {/* Factors list */}
                      <div className="space-y-1.5 pt-2">
                        {report.factors.map((fact, idx) => (
                          <p key={idx} className="text-xs text-slate-300 flex items-start gap-1">
                            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
                            <span>{fact}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Score section */}
                  <div className="flex items-center gap-6 self-start md:self-auto flex-shrink-0">
                    <div className={`text-center py-2.5 px-4 rounded-2xl border ${getRiskColor(report.riskLevel)}`}>
                      <span className="text-[9px] uppercase tracking-wider block font-bold">Risk Score</span>
                      <strong className="text-2xl font-black">{report.riskScore}</strong>
                      <span className="text-[9px] text-slate-500 block">/ 100</span>
                    </div>

                    {/* AI Expander button */}
                    {report.aiAnalysis && (
                      <button
                        onClick={() => toggleAI(report.studentId)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-900 text-purple-400 hover:text-purple-300 transition-colors"
                        title="AI Analysis recommendation detail"
                      >
                        {isAIExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible AI Analysis Details */}
                {isAIExpanded && report.aiAnalysis && (
                  <div className="px-5 pb-5 border-t border-slate-900 bg-slate-950/40 p-4 space-y-3.5 text-xs text-slate-350">
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold uppercase tracking-wider text-[10px]">
                      <Sparkles className="w-3.5 h-3.5" /> AI Evaluation Report
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <strong className="text-slate-300 block mb-0.5"> Likely Root Cause:</strong>
                          <p className="leading-relaxed">{report.aiAnalysis.likelyRootCause}</p>
                        </div>
                        <div>
                          <strong className="text-slate-300 block mb-0.5"> Timeline urgency:</strong>
                          <span className="text-amber-500 font-semibold">{report.aiAnalysis.timeline}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <strong className="text-slate-300 block mb-0.5"> Recommended Interventions:</strong>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {report.aiAnalysis.recommendedIntervention.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-slate-300 block mb-0.5"> Action Taken By:</strong>
                          <span>{report.aiAnalysis.actionTakenBy}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons Panel */}
                <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/20 flex flex-wrap gap-2 justify-end">
                  <button
                    disabled={actionInProgress[`${report.studentId}_ALERT_PARENTS`] === 'running' || isReviewed}
                    onClick={() => handleAction('ALERT_PARENTS', report.studentId)}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    {actionInProgress[`${report.studentId}_ALERT_PARENTS`] === 'running' ? (
                      <Loader2 className="w-3 animate-spin" />
                    ) : (
                      '📞'
                    )}{' '}
                    Alert Parents
                  </button>
                  <button
                    disabled={actionInProgress[`${report.studentId}_MESSAGE_TEACHER`] === 'running' || isReviewed}
                    onClick={() => handleAction('MESSAGE_TEACHER', report.studentId)}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    {actionInProgress[`${report.studentId}_MESSAGE_TEACHER`] === 'running' ? (
                      <Loader2 className="w-3 animate-spin" />
                    ) : (
                      '💬'
                    )}{' '}
                    Message Teacher
                  </button>
                  {!isReviewed && (
                    <button
                      disabled={actionInProgress[`${report.studentId}_MARK_REVIEWED`] === 'running'}
                      onClick={() => handleAction('MARK_REVIEWED', report.studentId)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      {actionInProgress[`${report.studentId}_MARK_REVIEWED`] === 'running' ? (
                        <Loader2 className="w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}{' '}
                      Mark as Reviewed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
