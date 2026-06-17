"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Plus,
  Sparkles,
  Printer,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  X,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Percent,
  CheckCircle,
  Bell,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { EmptyState, ExportButton } from "@/components/shared";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

interface StudentItem {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  class: {
    name: string;
    section: string;
  } | null;
}

interface FeeItem {
  id: string;
  amount: number;
  paidAmount: number;
  feeType: "TUITION" | "TRANSPORT" | "LAB" | "SPORTS" | "OTHER";
  month: number;
  year: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "PARTIAL";
  paidAt: string | null;
  receiptNumber: string | null;
  note: string | null;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber: string;
    class: {
      id: string;
      name: string;
      section: string;
    } | null;
  };
}

interface DashboardStats {
  totalCollected: number;
  totalPending: number;
  overdueCount: number;
  collectionRate: number;
}

// ─── Constants ─────────────────────────────────────────────────────────
const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const YEAR_OPTIONS = [2025, 2026, 2027];

const FEE_TYPE_LABELS: Record<string, string> = {
  TUITION: "Tuition Fee",
  TRANSPORT: "Transport Fee",
  LAB: "Lab Fee",
  SPORTS: "Sports Fee",
  OTHER: "Other Fee",
};

const FEE_TYPE_COLORS: Record<string, string> = {
  TUITION: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  TRANSPORT: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  LAB: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  SPORTS: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  OTHER: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

const FEE_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  OVERDUE: "bg-red-500/10 text-red-400 border border-red-500/25",
  PARTIAL: "bg-sky-500/10 text-sky-400 border border-sky-500/25",
};

export default function FeeOverviewPage() {
  // ─── Query & Listing State ──────────────────────────────────────────
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCollected: 0,
    totalPending: 0,
    overdueCount: 0,
    collectionRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Checks for bulk selection
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());

  // ─── Dialog Triggers ────────────────────────────────────────────────
  const [openSingleDialog, setOpenSingleDialog] = useState(false);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openReceiptModal, setOpenReceiptModal] = useState(false);

  // ─── Selection Targets ──────────────────────────────────────────────
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<string | null>(null);

  // ─── Create Single Invoice Dialog States ────────────────────────────
  const [studentSearch, setStudentSearch] = useState("");
  const [searchedStudents, setSearchedStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [singleAmount, setSingleAmount] = useState("");
  const [singleFeeType, setSingleFeeType] = useState("TUITION");
  const [singleMonth, setSingleMonth] = useState(new Date().getMonth() + 1);
  const [singleYear, setSingleYear] = useState(new Date().getFullYear());
  const [singleDueDate, setSingleDueDate] = useState("");
  const [singleNote, setSingleNote] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // ─── Bulk Generate Dialog States ────────────────────────────────────
  const [bulkClassId, setBulkClassId] = useState("all");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkFeeType, setBulkFeeType] = useState("TUITION");
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [generatingBulk, setGeneratingBulk] = useState(false);

  // ─── Mark As Paid Dialog States ─────────────────────────────────────
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // ─── Helper: Format Currency ────────────────────────────────────────
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ─── API: Fetch Fees & Classes ──────────────────────────────────────
  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        classId: classFilter,
        status: statusFilter,
        feeType: typeFilter,
        month: monthFilter,
        year: yearFilter,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/principal/fees?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoices");

      setFees(data.fees);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      toast.error(err.message || "Error retrieving records");
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter, typeFilter, monthFilter, yearFilter, page, limit]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/principal/classes");
      const data = await res.json();
      if (res.ok && data.classes) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error("Classes fetch error:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  // Reset page when filters update
  useEffect(() => {
    setPage(1);
  }, [search, classFilter, statusFilter, typeFilter, monthFilter, yearFilter, limit]);

  // Student debounced search
  useEffect(() => {
    if (!studentSearch.trim()) {
      setSearchedStudents([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setStudentSearchLoading(true);
        const res = await fetch(`/api/principal/students?search=${studentSearch}&limit=5`);
        const data = await res.json();
        if (res.ok && data.students) {
          setSearchedStudents(data.students);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [studentSearch]);

  // ─── API: Create Single Invoice ─────────────────────────────────────
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Please select a student first");
      return;
    }
    if (!singleAmount || isNaN(Number(singleAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!singleDueDate) {
      toast.error("Please select a due date");
      return;
    }

    try {
      setCreatingInvoice(true);
      const res = await fetch("/api/principal/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: false,
          studentId: selectedStudent.id,
          amount: parseFloat(singleAmount),
          feeType: singleFeeType,
          month: singleMonth,
          year: singleYear,
          dueDate: singleDueDate,
          note: singleNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      toast.success("Invoice generated successfully");
      setOpenSingleDialog(false);
      setSelectedStudent(null);
      setStudentSearch("");
      setSingleAmount("");
      setSingleNote("");
      fetchFees();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invoice");
    } finally {
      setCreatingInvoice(false);
    }
  };

  // ─── API: Bulk Generate ─────────────────────────────────────────────
  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAmount || isNaN(Number(bulkAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!bulkDueDate) {
      toast.error("Please select a due date");
      return;
    }

    try {
      setGeneratingBulk(true);
      const res = await fetch("/api/principal/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          classId: bulkClassId,
          amount: parseFloat(bulkAmount),
          feeType: bulkFeeType,
          month: bulkMonth,
          year: bulkYear,
          dueDate: bulkDueDate,
          note: bulkNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate bulk fees");

      toast.success(data.message || "Bulk generation completed successfully");
      setOpenBulkDialog(false);
      setBulkAmount("");
      setBulkNote("");
      fetchFees();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate bulk billing");
    } finally {
      setGeneratingBulk(false);
    }
  };

  // ─── MARK AS PAID Action ────────────────────────────────────────────
  const handleOpenMarkPaid = (fee: FeeItem) => {
    setSelectedFee(fee);
    setPaymentAmount((fee.amount - fee.paidAmount).toString());
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentNote("");
    setOpenPaymentDialog(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;
    if (!paymentAmount || isNaN(Number(paymentAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSavingPayment(true);
      const paidValue = parseFloat(paymentAmount) + selectedFee.paidAmount;

      const res = await fetch(`/api/principal/fees/${selectedFee.id}/mark-paid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: paidValue,
          paidAt: paymentDate,
          note: paymentNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark as paid");

      toast.success("Payment recorded and parent notified!");
      setOpenPaymentDialog(false);
      fetchFees();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  // ─── SEND REMINDER Action ───────────────────────────────────────────
  const handleSendReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/principal/fees/${id}/send-reminder`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reminder");
      }

      toast.success("Reminder notification sent to parent 🔔");
    } catch (err: any) {
      toast.error(err.message || "Could not deliver reminder");
    }
  };

  // ─── BULK ACTION: Send Reminders to Selections ──────────────────────
  const handleBulkSendReminders = async () => {
    if (selectedFeeIds.size === 0) return;
    const ids = Array.from(selectedFeeIds);
    let successCount = 0;

    const promise = Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/principal/fees/${id}/send-reminder`, { method: "POST" });
          if (res.ok) successCount++;
        } catch (e) {
          console.error(e);
        }
      })
    );

    toast.promise(promise, {
      loading: "Dispatching queue reminders...",
      success: () => {
        setSelectedFeeIds(new Set());
        return `Successfully dispatched ${successCount} reminders!`;
      },
      error: "Error dispatching reminders",
    });
  };

  const handleFeesExport = async (dataToExport: FeeItem[], format: "pdf" | "excel") => {
    if (format === "pdf") {
      const { exportFeesPDF } = await import("@/lib/export/pdf-generator");
      const mapped = dataToExport.map((f) => ({
        studentName: f.student.name,
        class: f.student.class ? `${f.student.class.name}-${f.student.class.section}` : "-",
        feeType: f.feeType,
        amount: f.amount,
        paidAmount: f.paidAmount,
        status: f.status,
        dueDate: f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "-",
      }));
      exportFeesPDF(mapped, { name: "EduMind AI Academy", city: "Main" });
    } else {
      const { exportFeesExcel } = await import("@/lib/export/excel-generator");
      const mapped = dataToExport.map((f) => ({
        studentName: f.student.name,
        class: f.student.class ? `${f.student.class.name}-${f.student.class.section}` : "-",
        feeType: f.feeType,
        amount: f.amount,
        paidAmount: f.paidAmount,
        status: f.status,
        dueDate: f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "-",
        paidDate: f.paidAt ? new Date(f.paidAt).toLocaleDateString() : "-",
      }));
      const selectedMonthLabel = MONTH_OPTIONS.find((m) => m.value === parseInt(monthFilter))?.label || "All";
      exportFeesExcel(mapped, selectedMonthLabel, parseInt(yearFilter));
    }
  };

  // ─── BULK ACTION: Export to Excel/CSV ──────────────────────────────
  const handleExportCSV = () => {
    if (fees.length === 0) {
      toast.error("No fee records available to export");
      return;
    }

    const headers = ["Student Name", "Class", "Fee Type", "Expected Amount", "Paid Amount", "Due Date", "Status", "Receipt Number"];
    const rows = fees.map((f) => [
      f.student.name,
      f.student.class ? `${f.student.class.name}-${f.student.class.section}` : "Unassigned",
      FEE_TYPE_LABELS[f.feeType],
      f.amount,
      f.paidAmount,
      new Date(f.dueDate).toLocaleDateString(),
      f.status,
      f.receiptNumber || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fees_report_month_${monthFilter}_year_${yearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  // Checkbox helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = fees.map((f) => f.id);
      setSelectedFeeIds(new Set(allIds));
    } else {
      setSelectedFeeIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedFeeIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // ─── API: Delete Invoice ────────────────────────────────────────────
  const handleOpenDelete = (id: string) => {
    setFeeToDelete(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteInvoice = async () => {
    if (!feeToDelete) return;
    try {
      const res = await fetch(`/api/principal/fees/${feeToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted successfully");
      fetchFees();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice");
    } finally {
      setOpenDeleteDialog(false);
      setFeeToDelete(null);
    }
  };

  // Expected target calculation for Card 1
  const expectedTotal = stats.totalCollected + stats.totalPending;

  return (
    <div className="space-y-6 pb-12">
      {/* Print Receipts Custom CSS Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="size-8 text-blue-400" />
            Fee Overview
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Monitor month-by-month cashflow collection balances and dispatch payment notices.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <ExportButton
            data={fees}
            type="both"
            exportFunction={(data, format) => handleFeesExport(data, format)}
            className="h-10 text-sm border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800"
          />

          <Button
            onClick={() => {
              setBulkDueDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().substring(0, 10));
              setOpenBulkDialog(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center justify-center gap-2 w-full sm:w-auto h-10"
          >
            <Sparkles className="size-4 animate-pulse" />
            🤖 Bulk Billing Wizard
          </Button>

          <Button
            onClick={() => {
              setSingleDueDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().substring(0, 10));
              setOpenSingleDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto h-10"
          >
            <Plus className="size-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Total Expected</span>
            <p className="text-xl font-bold text-gray-100">{formatCurrency(expectedTotal)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider block">Total Collected</span>
            <p className="text-xl font-bold text-emerald-450">{formatCurrency(stats.totalCollected)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-red-500/70 uppercase tracking-wider block">Pending</span>
            <p className="text-xl font-bold text-red-450">{formatCurrency(stats.totalPending)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-rose-950 bg-rose-950/20">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-rose-400/70 uppercase tracking-wider block">Overdue</span>
            <p className="text-xl font-bold text-rose-500">{stats.overdueCount} bills</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-4 flex flex-col justify-between h-[74px]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Rate</span>
              <p className="text-lg font-bold text-blue-400">{stats.collectionRate.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
              <div
                className="bg-blue-500 h-1 rounded-full"
                style={{ width: `${Math.min(100, stats.collectionRate)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS PANEL */}
      <div className="glass-card border-gray-800 p-4 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Text Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student or admission #..."
              className="pl-9 bg-slate-950/60 border-gray-800 text-gray-100 placeholder:text-gray-500 h-10"
            />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-950 text-gray-300">
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-gray-300">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-slate-950 text-gray-300">
                  {cls.displayName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-gray-300">All Statuses</option>
              <option value="PAID" className="bg-slate-950 text-gray-300">Paid Only</option>
              <option value="PENDING" className="bg-slate-950 text-gray-300">Pending Only</option>
              <option value="OVERDUE" className="bg-slate-950 text-gray-300">Overdue Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Fee Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-gray-300">All Categories</option>
              <option value="TUITION" className="bg-slate-950 text-gray-300">Tuition Fee</option>
              <option value="TRANSPORT" className="bg-slate-950 text-gray-300">Transport Fee</option>
              <option value="LAB" className="bg-slate-950 text-gray-300">Lab Fee</option>
              <option value="SPORTS" className="bg-slate-950 text-gray-300">Sports Fee</option>
              <option value="OTHER" className="bg-slate-950 text-gray-300">Other Fee</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Clear Filters & Export actions */}
        <div className="flex justify-between items-center pt-1 text-xs">
          <div className="flex gap-2">
            {selectedFeeIds.size > 0 && (
              <Button
                onClick={handleBulkSendReminders}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5 h-8 text-[11px]"
              >
                <Bell className="size-3.5" />
                Send Reminders ({selectedFeeIds.size})
              </Button>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="border-gray-800 bg-slate-900/40 text-gray-350 hover:bg-slate-800 hover:text-white flex items-center gap-1 h-8"
            >
              <Download className="size-3.5" />
              Export to Excel (CSV)
            </Button>

            {(search || classFilter !== "all" || statusFilter !== "all" || typeFilter !== "all") && (
              <Button
                onClick={() => {
                  setSearch("");
                  setClassFilter("all");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                variant="link"
                className="text-gray-400 hover:text-white p-0 h-auto"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* FEE TABLE */}
      <Card className="glass-card border-gray-800 bg-slate-900/20 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <ResponsiveTable<FeeItem>
            loading={loading}
            loadingText="Fetching billing database..."
            emptyText="No Invoices Found"
            emptyIcon={
              <EmptyState
                icon={CreditCard}
                title="No Fee Records"
                description="Fee records appear here when generated"
                actionLabel="Generate Fees"
                onAction={() => setOpenBulkDialog(true)}
              />
            }
            data={fees}
            rowIdAccessor={(fee) => fee.id}
            selectable
            selectedIds={selectedFeeIds}
            onSelectAll={(checked) => handleSelectAll(checked)}
            onSelectRow={(fee, checked) => handleSelectRow(fee.id, checked)}
            mobileCardHeader={(fee) => (
              <span className="font-semibold text-white truncate max-w-[200px]">
                {fee.student.name}
              </span>
            )}
            mobileCardSubtitle={(fee) => {
              const studentClass = fee.student.class
                ? `${fee.student.class.name}-${fee.student.class.section}`
                : "Unassigned";
              return (
                <span className="text-[10px] text-gray-500 font-medium">
                  Class: {studentClass} | Adm: {fee.student.admissionNumber}
                </span>
              );
            }}
            columns={[
              {
                header: "Student",
                hideInMobileCard: true,
                render: (fee) => {
                  const studentClass = fee.student.class
                    ? `${fee.student.class.name}-${fee.student.class.section}`
                    : "Unassigned";
                  return (
                    <div className="flex flex-col">
                      <span className="font-semibold text-white truncate max-w-[160px]">
                        {fee.student.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        Class: {studentClass} | Adm: {fee.student.admissionNumber}
                      </span>
                    </div>
                  );
                }
              },
              {
                header: "Category",
                render: (fee) => (
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border inline-block", FEE_TYPE_COLORS[fee.feeType])}>
                    {FEE_TYPE_LABELS[fee.feeType]}
                  </span>
                )
              },
              {
                header: "Amount",
                render: (fee) => <span className="font-bold text-gray-200">{formatCurrency(fee.amount)}</span>
              },
              {
                header: "Due Date",
                render: (fee) => <span className="text-gray-400 text-xs">{new Date(fee.dueDate).toLocaleDateString()}</span>
              },
              {
                header: "Paid Amount",
                render: (fee) => <span className="font-medium text-emerald-400">{fee.paidAmount > 0 ? formatCurrency(fee.paidAmount) : "—"}</span>
              },
              {
                header: "Status",
                className: "text-center",
                render: (fee) => (
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider inline-block", FEE_STATUS_COLORS[fee.status])}>
                    {fee.status}
                  </span>
                )
              }
            ]}
            actions={(fee) => (
              <>
                {fee.status !== "PAID" && (
                  <>
                    <Button
                      onClick={() => handleOpenMarkPaid(fee)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-2.5 py-1 h-7 cursor-pointer w-full sm:w-auto"
                    >
                      Mark as Paid
                    </Button>

                    <Button
                      onClick={() => handleSendReminder(fee.id)}
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/20 cursor-pointer w-full sm:w-7 sm:h-7 flex items-center justify-center gap-1 sm:gap-0"
                      title="Send Reminder Notice"
                    >
                      <Bell className="size-3.5" />
                      <span className="sm:hidden text-xs">Send Reminder</span>
                    </Button>
                  </>
                )}

                {fee.status === "PAID" && (
                  <Button
                    onClick={() => {
                      setSelectedFee(fee);
                      setOpenReceiptModal(true);
                    }}
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 cursor-pointer w-full sm:w-7 sm:h-7 flex items-center justify-center gap-1 sm:gap-0"
                    title="Receipt overview"
                  >
                    <Printer className="size-3.5" />
                    <span className="sm:hidden text-xs">Print Receipt</span>
                  </Button>
                )}

                <Button
                  onClick={() => handleOpenDelete(fee.id)}
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 cursor-pointer w-full sm:w-7 sm:h-7 flex items-center justify-center gap-1 sm:gap-0"
                  title="Delete Invoice"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sm:hidden text-xs">Delete</span>
                </Button>
              </>
            )}
          />
        </div>

        {/* Pagination controls */}
        {!loading && totalRecords > 0 && (
          <div className="py-4 px-4 border-t border-gray-800/80 bg-slate-950/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="bg-slate-950/60 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries of {totalRecords} records</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                className="h-8 border-gray-800 bg-slate-900/40 text-gray-300 disabled:opacity-50 text-xs"
              >
                Previous
              </Button>
              <div className="px-3 py-1 bg-slate-950 rounded text-xs font-semibold text-gray-300 border border-gray-800/60">
                Page {page} of {totalPages}
              </div>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
                className="h-8 border-gray-800 bg-slate-900/40 text-gray-300 disabled:opacity-50 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Dialog: Create Single Invoice ───────────────────────────────── */}
      <Dialog open={openSingleDialog} onOpenChange={setOpenSingleDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="size-5 text-blue-400" />
              Create Single Invoice
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSingle} className="space-y-4 pt-2">
            <div className="space-y-2 relative">
              <Label className="text-xs font-semibold text-gray-400 uppercase">1. Select Student</Label>
              {selectedStudent ? (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">{selectedStudent.name}</p>
                    <p className="text-xs text-gray-400">
                      Class: {selectedStudent.class ? `${selectedStudent.class.name}-${selectedStudent.class.section}` : "None"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearch("");
                    }}
                    variant="ghost"
                    className="size-7 p-0 rounded-full hover:bg-slate-800"
                  >
                    <X className="size-4 text-gray-400" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Type name, roll #, or admission #..."
                      className="pl-9 bg-slate-950 text-white border-gray-800"
                    />
                  </div>

                  {studentSearchLoading && (
                    <div className="absolute right-3 top-9 flex items-center">
                      <Loader2 className="size-4 text-blue-500 animate-spin" />
                    </div>
                  )}

                  {searchedStudents.length > 0 && (
                    <div className="absolute z-10 w-full bg-slate-950 border border-gray-800 rounded-md shadow-xl divide-y divide-gray-900 max-h-40 overflow-y-auto">
                      {searchedStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setSearchedStudents([]);
                          }}
                          className="p-2.5 hover:bg-slate-800/80 cursor-pointer transition text-xs"
                        >
                          <p className="font-semibold text-white">{s.name}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">
                            Roll: {s.rollNumber} | Class: {s.class ? `${s.class.name}-${s.class.section}` : "Unassigned"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400 uppercase">2. Bill Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Fee Type</label>
                  <select
                    value={singleFeeType}
                    onChange={(e) => setSingleFeeType(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-800 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="TUITION">Tuition Fee</option>
                    <option value="TRANSPORT">Transport Fee</option>
                    <option value="LAB">Lab Fee</option>
                    <option value="SPORTS">Sports Fee</option>
                    <option value="OTHER">Other Fee</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Amount (PKR)</label>
                  <Input
                    type="number"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="bg-slate-950 text-white border-gray-800 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Billing Month</label>
                <select
                  value={singleMonth}
                  onChange={(e) => setSingleMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-gray-800 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Billing Year</label>
                <select
                  value={singleYear}
                  onChange={(e) => setSingleYear(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-gray-800 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Due Date</label>
              <Input
                type="date"
                value={singleDueDate}
                onChange={(e) => setSingleDueDate(e.target.value)}
                className="bg-slate-950 text-white border-gray-800 h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Optional Invoice Note</label>
              <Input
                value={singleNote}
                onChange={(e) => setSingleNote(e.target.value)}
                className="bg-slate-950 text-white border-gray-800 h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => setOpenSingleDialog(false)}
                variant="outline"
                className="border-gray-800 text-gray-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingInvoice}
                className="bg-blue-600 hover:bg-blue-500 text-white animate-none"
              >
                {creatingInvoice ? <Loader2 className="size-4 animate-spin" /> : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Bulk Generate Invoices ──────────────────────────────── */}
      <Dialog open={openBulkDialog} onOpenChange={setOpenBulkDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-purple-400" />
              AI Bulk Billing Wizard
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBulk} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400">Target Student Group</Label>
              <select
                value={bulkClassId}
                onChange={(e) => setBulkClassId(e.target.value)}
                className="w-full bg-slate-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-250 outline-none h-9 focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="all">Entire School (All Classes)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-400">Fee Type</Label>
                <select
                  value={bulkFeeType}
                  onChange={(e) => setBulkFeeType(e.target.value)}
                  className="w-full bg-slate-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-250 outline-none h-9 cursor-pointer"
                >
                  <option value="TUITION">Tuition Fee</option>
                  <option value="TRANSPORT">Transport Fee</option>
                  <option value="LAB">Lab Fee</option>
                  <option value="SPORTS">Sports Fee</option>
                  <option value="OTHER">Other Fee</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-400">Amount (PKR)</Label>
                <Input
                  type="number"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-400">Billing Month</Label>
                <select
                  value={bulkMonth}
                  onChange={(e) => setBulkMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-250 outline-none h-9 cursor-pointer"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-400">Billing Year</Label>
                <select
                  value={bulkYear}
                  onChange={(e) => setBulkYear(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-250 outline-none h-9 cursor-pointer"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-400">Due Date</Label>
              <Input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
                className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-400">Note</Label>
              <Input
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => setOpenBulkDialog(false)}
                variant="outline"
                className="border-gray-855 text-gray-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generatingBulk}
                className="bg-gradient-to-r from-purple-650 to-indigo-650 text-white"
              >
                {generatingBulk ? <Loader2 className="size-4 animate-spin" /> : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Mark As Paid ────────────────────────────────────────── */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-450" />
              Mark Invoice as Paid
            </DialogTitle>
          </DialogHeader>
          {selectedFee && (
            <form onSubmit={handleSavePayment} className="space-y-4 pt-2">
              <div className="p-3 bg-slate-950/60 border border-gray-800 rounded-lg text-xs space-y-1">
                <p className="text-gray-400">Student: <span className="font-semibold text-white">{selectedFee.student.name}</span></p>
                <p className="text-gray-400">Class: <span className="font-semibold text-white">{selectedFee.student.class ? `${selectedFee.student.class.name}-${selectedFee.student.class.section}` : "None"}</span></p>
                <p className="text-gray-400">Total Bill Amount: <span className="font-semibold text-white">{formatCurrency(selectedFee.amount)}</span></p>
                <p className="text-gray-400">Remaining Balance: <span className="font-semibold text-white">{formatCurrency(selectedFee.amount - selectedFee.paidAmount)}</span></p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Amount Paid (PKR)</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedFee.amount - selectedFee.paidAmount}
                    className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Notes (Optional)</Label>
                  <Input
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Bank Transfer Reference, Cash payment etc."
                    className="bg-slate-950 text-white border-gray-800 h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => setOpenPaymentDialog(false)}
                  variant="outline"
                  className="border-gray-800 text-gray-400 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingPayment}
                  className="bg-emerald-650 hover:bg-emerald-550 text-white"
                >
                  {savingPayment ? <Loader2 className="size-4 animate-spin" /> : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Print Receipt Modal ─────────────────────────────────── */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-lg p-0 overflow-hidden">
          {selectedFee && (
            <div>
              <div id="print-section" className="p-8 space-y-6 bg-slate-900 text-white">
                <div className="flex justify-between items-start border-b border-gray-850 pb-5">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <CreditCard className="size-6 text-blue-400" />
                      EDUMIND ACADEMY
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      AI-Powered School Portal | Receipt Verification
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      PAID
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Receipt: {selectedFee.receiptNumber || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Billed To:</span>
                    <div>
                      <p className="font-bold text-gray-250 text-sm">{selectedFee.student.name}</p>
                      <p className="text-gray-400 mt-0.5">
                        Class: {selectedFee.student.class ? `${selectedFee.student.class.name}-${selectedFee.student.class.section}` : "Unassigned"}
                      </p>
                      <p className="text-gray-400">Admission No: {selectedFee.student.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Payment Info:</span>
                    <div className="space-y-0.5">
                      <p className="text-gray-400">
                        Month: <span className="text-gray-250 font-semibold">{MONTH_OPTIONS.find((m) => m.value === selectedFee.month)?.label} {selectedFee.year}</span>
                      </p>
                      <p className="text-gray-400">
                        Due Date: <span className="text-gray-250 font-semibold">{new Date(selectedFee.dueDate).toLocaleDateString()}</span>
                      </p>
                      {selectedFee.paidAt && (
                        <p className="text-gray-400">
                          Paid On: <span className="text-emerald-400 font-semibold">{new Date(selectedFee.paidAt).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-850 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-slate-950/60 p-2.5 font-semibold text-gray-400 uppercase">
                    <span>Category</span>
                    <span className="text-center">Rate / Duration</span>
                    <span className="text-right">Total Due</span>
                  </div>
                  <div className="divide-y divide-gray-850">
                    <div className="grid grid-cols-3 p-3 text-gray-200">
                      <span>{FEE_TYPE_LABELS[selectedFee.feeType]}</span>
                      <span className="text-center">1 Month</span>
                      <span className="text-right font-bold">{formatCurrency(selectedFee.amount)}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/30 border-t border-gray-850 space-y-1 text-right">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedFee.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400 font-semibold">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(selectedFee.paidAmount)}</span>
                    </div>
                  </div>
                </div>

                {selectedFee.note && (
                  <div className="p-3 rounded bg-slate-950/30 border border-gray-850/40 text-[11px] text-gray-405">
                    <span className="font-semibold text-gray-300">Note:</span> {selectedFee.note}
                  </div>
                )}

                <div className="text-center text-[10px] text-gray-500 pt-3 border-t border-gray-855">
                  Computer-verified payment receipt issued under the authority of EduMind AI Principal workstation.
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-gray-850 flex justify-end gap-2 no-print">
                <Button
                  onClick={() => setOpenReceiptModal(false)}
                  variant="outline"
                  className="border-gray-850 text-gray-405 hover:bg-slate-800 text-xs"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 text-xs"
                >
                  <Printer className="size-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Delete Confirmation ─────────────────────────────────── */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border border-gray-800 text-white max-w-sm">
          <AlertDialogHeader>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              Confirm Delete Invoice
            </div>
            <AlertDialogDescription className="text-gray-450 text-xs mt-2 leading-relaxed">
              Are you sure you want to delete this invoice? This will remove the bill from the records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => {
                setOpenDeleteDialog(false);
                setFeeToDelete(null);
              }}
              className="border-gray-850 text-gray-450 hover:bg-slate-800 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold border-none animate-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
