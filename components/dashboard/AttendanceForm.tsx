"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Save,
  Users,
  AlertTriangle,
  FileText,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { LoadingButton } from "@/components/shared";

interface Student {
  id: string;
  name: string;
  rollNumber: string | null;
  photo: string | null;
}

interface AttendanceRecord {
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  note: string;
}

interface AttendanceFormProps {
  classId: string;
  className: string;
  students: Student[];
  initialAttendance: Array<{ studentId: string; status: string; note: string | null }>;
}

export default function AttendanceForm({
  classId,
  className,
  students,
  initialAttendance,
}: AttendanceFormProps) {
  const router = useRouter();
  
  // Format today as YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState<string>(getTodayString());
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isAlreadyMarked, setIsAlreadyMarked] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Initialize records from initialAttendance or default to PRESENT
  useEffect(() => {
    const initialRecords: Record<string, AttendanceRecord> = {};
    
    if (initialAttendance && initialAttendance.length > 0) {
      setIsAlreadyMarked(true);
      students.forEach((student) => {
        const matching = initialAttendance.find((a) => a.studentId === student.id);
        initialRecords[student.id] = {
          status: (matching?.status as any) || "PRESENT",
          note: matching?.note || "",
        };
      });
    } else {
      setIsAlreadyMarked(false);
      students.forEach((student) => {
        initialRecords[student.id] = {
          status: "PRESENT",
          note: "",
        };
      });
    }
    
    setRecords(initialRecords);
    setHasChanges(false);
  }, [initialAttendance, students]);

  // Fetch attendance when date changes
  useEffect(() => {
    // Skip today's default loading since it's pre-fetched on server
    if (date === getTodayString()) return;

    const fetchDateAttendance = async () => {
      try {
        const res = await fetch(`/api/teacher/attendance/${classId}?date=${date}`);
        if (!res.ok) throw new Error("Failed to load records");
        const data = await res.json();
        
        const newRecords: Record<string, AttendanceRecord> = {};
        if (data && data.length > 0) {
          setIsAlreadyMarked(true);
          students.forEach((student) => {
            const matching = data.find((a: any) => a.studentId === student.id);
            newRecords[student.id] = {
              status: matching?.status || "PRESENT",
              note: matching?.note || "",
            };
          });
        } else {
          setIsAlreadyMarked(false);
          students.forEach((student) => {
            newRecords[student.id] = {
              status: "PRESENT",
              note: "",
            };
          });
        }
        setRecords(newRecords);
        setHasChanges(false);
      } catch (err: any) {
        console.error(err);
        toast.error("Could not fetch records for the selected date.");
      }
    };

    fetchDateAttendance();
  }, [date, classId, students]);

  // Handle status toggle
  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE") => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setHasChanges(true);
  };

  // Handle note change
  const handleNoteChange = (studentId: string, note: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
    setHasChanges(true);
  };

  // Bulk mark all as PRESENT
  const handleMarkAllPresent = () => {
    const updatedRecords: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updatedRecords[s.id] = {
        status: "PRESENT",
        note: records[s.id]?.note || "",
      };
    });
    setRecords(updatedRecords);
    setHasChanges(true);
    toast.success("All students marked present!");
  };

  // Calculate real-time counts
  const getCounts = () => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    Object.values(records).forEach((r) => {
      if (r.status === "PRESENT") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "LATE") late++;
      else if (r.status === "LEAVE") leave++;
    });

    return { present, absent, late, leave };
  };

  const { present, absent, late, leave } = getCounts();

  // Save changes
  const handleSave = async () => {
    // Validate selections
    const isSelectionComplete = students.every((s) => records[s.id]?.status);
    if (!isSelectionComplete) {
      toast.error("Please ensure a selection is made for all students.");
      return;
    }

    setIsSaving(true);
    try {
      const recordsArray = Object.entries(records).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        note: data.note,
      }));

      let response;
      if (isAlreadyMarked) {
        // Hitting the PUT API endpoint to update existing attendance
        response = await fetch(`/api/teacher/attendance/${classId}/${date}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: recordsArray }),
        });
      } else {
        // Hitting the POST API endpoint to save new attendance
        response = await fetch(`/api/teacher/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, date, records: recordsArray }),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save attendance");
      }

      toast.success("Attendance saved! Notifications sent to parents");
      router.push("/teacher/attendance");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Get Initials for Avatar Fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher/attendance")}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mark Attendance
              </span>
              <span className="text-gray-700">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {students.length} Students
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">{className}</h1>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start bg-gray-900/80 border border-white/[0.06] rounded-xl px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-400 sm:hidden font-medium">Select Date:</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark] cursor-pointer text-right sm:text-left"
          />
        </div>
      </div>

      {/* Duplicate Warning banner */}
      {isAlreadyMarked && (
        <Card className="border border-yellow-500/20 bg-yellow-950/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-300">
              Attendance already marked for this date.
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              You can make changes and save to overwrite the existing record. The parents of newly absent students will receive notifications.
            </p>
          </div>
        </Card>
      )}

      {/* Action Bar & Stats Summary */}
      <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Ticker counts */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              {present} Present
            </span>
            <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
              {absent} Absent
            </span>
            <span className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
              {late} Late
            </span>
            <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
              {leave} Leave
            </span>
          </div>

          {/* Quick operations */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur-sm border-t border-white/[0.06] flex items-center justify-end gap-3 z-50 lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:p-0 lg:bg-transparent lg:border-t-0 lg:z-auto pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-0">
            <button
              onClick={handleMarkAllPresent}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
            >
              <CheckCircle className="size-4" />
              Mark All Present
            </button>

            <LoadingButton
              onClick={handleSave}
              disabled={!hasChanges}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-500 border border-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-lg shadow-blue-500/10 cursor-pointer"
            >
              <Save className="size-4 mr-1.5" />
              Save Attendance
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* ── STUDENT CARDS LIST ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((student) => {
          const record = records[student.id] || { status: "PRESENT", note: "" };
          const isNoteExpanded = expandedNoteId === student.id;

          // Color tags matching active status
          const statusColors = {
            PRESENT: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            ABSENT: "bg-red-500/10 border-red-500/20 text-red-400",
            LATE: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
            LEAVE: "bg-blue-500/10 border-blue-500/20 text-blue-400",
          };

          return (
            <Card
              key={student.id}
              className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-white/[0.1] transition-all"
            >
              {/* Top half: Photo + Name + Notes Trigger */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo with fallback initials */}
                  <div className="size-10 rounded-full border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
                    {student.photo ? (
                      <Image
                        src={student.photo}
                        alt={student.name}
                        width={40}
                        height={40}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <InitialsAvatar name={student.name} size={40} className="size-full" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white leading-tight truncate">
                      {student.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                      Roll Number: {student.rollNumber || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Note button */}
                <button
                  onClick={() => setExpandedNoteId(isNoteExpanded ? null : student.id)}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    record.note
                      ? "text-blue-400 border-blue-500/20 bg-blue-500/5"
                      : "text-gray-500 border-white/[0.08] hover:text-white"
                  }`}
                  title="Add remarks or note"
                >
                  <FileText className="size-3.5" />
                </button>
              </div>

              {/* Attendance Toggle Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* PRESENT Toggle */}
                <button
                  onClick={() => handleStatusChange(student.id, "PRESENT")}
                  className={`py-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    record.status === "PRESENT"
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10"
                      : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="sm:hidden">Present</span>
                  <span className="hidden sm:inline">P</span>
                </button>

                {/* ABSENT Toggle */}
                <button
                  onClick={() => handleStatusChange(student.id, "ABSENT")}
                  className={`py-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    record.status === "ABSENT"
                      ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/10"
                      : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="sm:hidden">Absent</span>
                  <span className="hidden sm:inline">A</span>
                </button>

                {/* LATE Toggle */}
                <button
                  onClick={() => handleStatusChange(student.id, "LATE")}
                  className={`py-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    record.status === "LATE"
                      ? "bg-yellow-600 text-white border-yellow-600 shadow-md shadow-yellow-600/10"
                      : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="sm:hidden">Late</span>
                  <span className="hidden sm:inline">L</span>
                </button>

                {/* LEAVE Toggle */}
                <button
                  onClick={() => handleStatusChange(student.id, "LEAVE")}
                  className={`py-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    record.status === "LEAVE"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10"
                      : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="sm:hidden">Leave</span>
                  <span className="hidden sm:inline">LV</span>
                </button>
              </div>

              {/* Note input Drawer (Collapsible) */}
              {isNoteExpanded && (
                <div className="pt-1 transition-all duration-200">
                  <input
                    type="text"
                    value={record.note}
                    onChange={(e) => handleNoteChange(student.id, e.target.value)}
                    placeholder="Enter attendance note..."
                    className="w-full text-xs bg-black/40 border border-white/[0.06] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
