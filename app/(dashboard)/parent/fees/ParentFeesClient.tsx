"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Download,
  CheckCircle2,
  XCircle,
  Building,
  DollarSign,
  TrendingUp,
  Award,
  FileText,
  Calendar,
  AlertCircle,
  QrCode,
  Info,
  Clock,
  Printer,
  ChevronRight,
  Filter,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Image from "next/image";
import InitialsAvatar from "@/components/shared/InitialsAvatar";
import { ExportButton } from "@/components/shared";

interface StudentInfo {
  id: string;
  name: string;
  rollNumber: string | null;
  className: string;
  section: string;
  photo: string | null;
  schoolName: string;
  admissionNumber: string;
}

interface ParentFeesClientProps {
  students: StudentInfo[];
  activeStudentId: string;
}

export default function ParentFeesClient({
  students,
  activeStudentId,
}: ParentFeesClientProps) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState(activeStudentId);

  const activeStudent = students.find((s) => s.id === selectedChildId) || students[0];

  const handleDownloadReceipt = async (row: any) => {
    const { exportFeeReceiptPDF } = await import("@/lib/export/pdf-generator");
    exportFeeReceiptPDF(
      {
        receiptNo: row.receiptNumber || `REC-${row.id.slice(-6).toUpperCase()}`,
        feeType: row.feeType,
        amount: row.amount,
        paidAmount: row.amount,
        dueDate: row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-",
        paidDate: row.paidDate || "-",
        status: row.status,
      },
      {
        name: activeStudent.name,
        rollNumber: activeStudent.rollNumber || "-",
        class: `${activeStudent.className} - ${activeStudent.section}`,
        admissionNumber: activeStudent.admissionNumber || activeStudent.id,
      },
      {
        name: "EduMind AI Academy",
        address: "Main Sector H-9, Islamabad",
        phone: "+92 51 111-222-333",
      }
    );
  };
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Year filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);



  const fetchFeeSummary = async (studentId: string, yearVal: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parent/fees/${studentId}?year=${yearVal}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeeData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load fee summaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChildId) {
      fetchFeeSummary(selectedChildId, selectedYear);
    }
  }, [selectedChildId, selectedYear]);

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    document.cookie = `selected_child_id=${childId}; path=/; max-age=31536000`;
    router.push(`/parent/fees?childId=${childId}`);
  };

  const handlePayConfirm = async () => {
    if (!feeData?.currentFee?.id) return;
    const feeId = feeData.currentFee.id;

    try {
      setIsSubmittingPayment(true);
      const res = await fetch(`/api/parent/fees/${feeId}/pay-request`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Payment request submitted! Marks as Pending Verification.");
      setIsPayOpen(false);
      
      // Reload details
      fetchFeeSummary(selectedChildId, selectedYear);
    } catch (err: any) {
      toast.error(err.message || "Failed to log payment request.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleYearChange = (yearVal: number) => {
    setSelectedYear(yearVal);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Header section with switch child logic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Fee & Billing cockpit
          </h2>
          <p className="text-muted-foreground mt-1">Manage monthly invoices, verify receipts, and view payments</p>
        </div>

        {/* Student selectors switches */}
        {students.length > 1 && (
          <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] p-1.5 rounded-xl self-start md:self-center">
            {students.map((stud) => (
              <button
                key={stud.id}
                onClick={() => handleChildSelect(stud.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedChildId === stud.id
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

      {/* Child Information Card and outstanding overview */}
      {activeStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 glass-card border-white/[0.06] bg-white/[0.01] backdrop-blur-xl rounded-2xl p-5 flex items-center gap-4 shadow-lg">
            {activeStudent.photo ? (
              <Image
                src={activeStudent.photo}
                alt={activeStudent.name}
                width={56}
                height={56}
                className="size-14 rounded-2xl object-cover ring-2 ring-violet-500/20 shadow-md"
              />
            ) : (
              <InitialsAvatar name={activeStudent.name} size={56} className="size-14" />
            )}
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{activeStudent.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Class {activeStudent.className} - {activeStudent.section}  •  Admission: {activeStudent.admissionNumber}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <Building className="size-3" />
                Campus: {activeStudent.schoolName}
              </p>
            </div>
          </Card>

          {/* Dues Status Block */}
          {!loading && feeData && (
            <Card className={`glass-card border-white/[0.06] rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-lg border-l-4 ${
              feeData.outstandingAmount > 0
                ? "text-rose-400 border-rose-500/20 bg-rose-500/5"
                : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
            }`}>
              {feeData.outstandingAmount > 0 ? (
                <>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Outstanding Dues</p>
                  <p className="text-3xl font-black mt-1">Rs. {feeData.outstandingAmount.toLocaleString()}</p>
                  <p className="text-[9px] mt-1 text-gray-500">Unpaid invoice remains pending verification</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-8 text-emerald-400 mb-1" />
                  <p className="text-sm font-bold text-emerald-300">All Clear ✅</p>
                  <p className="text-[9px] text-gray-500 mt-1">No outstanding school dues on account.</p>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Main Content grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <span className="size-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Validating invoice accounts...</p>
        </div>
      ) : (
        feeData && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column: Current month fee card details (40%) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
                
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                  <CreditCard className="size-4.5 text-violet-400" />
                  <span>Invoice: {feeData.currentFee.monthName} {feeData.currentFee.year}</span>
                </h3>

                <div className="space-y-4">
                  {/* Fee types splits */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-400 py-1.5 border-b border-white/[0.03]">
                      <span>Tuition Fee</span>
                      <span className="font-semibold text-white">Rs. {feeData.currentFee.tuitionFee.toLocaleString()}</span>
                    </div>
                    {feeData.currentFee.transportFee > 0 && (
                      <div className="flex justify-between text-gray-400 py-1.5 border-b border-white/[0.03]">
                        <span>Transport Route Charge</span>
                        <span className="font-semibold text-white">Rs. {feeData.currentFee.transportFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-extrabold py-2 text-sm">
                      <span>Total Amount Invoice</span>
                      <span className="text-violet-400">Rs. {feeData.currentFee.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex items-center justify-between text-xs gap-3">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Due Date:</span>
                    <span className="font-bold text-gray-300">
                      {new Date(feeData.currentFee.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  {/* Pay button or verification note */}
                  <div className="pt-2">
                    {feeData.currentFee.note === "Pending Verification" ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
                        <Clock className="size-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-0.5">
                          <p className="font-bold">Pending Verification ⏳</p>
                          <p className="text-[10px] text-amber-300/80">Voucher submitted. The school will verify bank clearance shortly.</p>
                        </div>
                      </div>
                    ) : feeData.currentFee.status === "PAID" ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold">Clear & Paid ✅</p>
                          <p className="text-[10px] text-emerald-300/80">Receipt: {feeData.currentFee.receiptNumber} • Paid Date: {new Date(feeData.currentFee.paidDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsPayOpen(true)}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl h-10 shadow-lg shadow-violet-900/30 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <DollarSign className="size-4" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Billing History Table (60%) */}
            <Card className="lg:col-span-3 glass-card border-white/[0.06] bg-white/[0.02] rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="size-4.5 text-violet-400" />
                  <span>Payment Ledgers History</span>
                </h3>

                {/* Years filters select dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500"><Filter className="size-3.5 inline mr-1" />Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="bg-slate-900 text-xs text-white border border-white/[0.08] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-violet-500 font-semibold"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-white/[0.08]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Month</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Paid Date</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider">Receipt No</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeData.paymentHistory.map((row: any) => {
                      let statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      if (row.status === "PAID") statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      if (row.status === "PENDING_VERIFICATION") statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";

                      return (
                        <TableRow key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                          <TableCell className="font-bold text-white text-xs">{row.monthName} {row.year}</TableCell>
                          <TableCell className="text-gray-400 text-xs">{row.feeType}</TableCell>
                          <TableCell className="text-gray-300 font-bold text-xs">Rs. {row.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-gray-400 text-xs">{row.paidDate || "N/A"}</TableCell>
                          <TableCell className="text-gray-300 text-xs font-medium">{row.receiptNumber || "N/A"}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`px-2 py-0.5 text-[8px] font-bold border rounded-md uppercase ${statusBadge}`}>
                              {row.status === "PENDING_VERIFICATION" ? "Pending verification" : row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.status === "PAID" ? (
                              <div className="flex justify-end gap-1.5">
                                <ExportButton
                                  data={[row]}
                                  type="pdf"
                                  exportFunction={() => handleDownloadReceipt(row)}
                                  className="size-7 rounded border-white/[0.08] bg-white/[0.02] text-violet-300 hover:text-violet-400 hover:bg-white/[0.04]"
                                  size="icon"
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => router.push(`/parent/fees/receipt/${row.id}`)}
                                  className="size-7 rounded border-white/[0.08] hover:bg-white/[0.04] text-violet-300 hover:text-violet-400"
                                  title="Print / View receipt voucher"
                                >
                                  <Printer className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-600 font-semibold italic">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )
      )}

      {/* ──── PAY NOW DIALOG BANK TRANSFER INFORMATION ──── */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-[460px] bg-slate-900 border-white/[0.08] text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="size-4.5 text-violet-400" />
              <span>Direct Bank Payment Voucher</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Transfer the dues to the school bank account below and confirm submission to notify the school.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Bank details grid cards */}
            <div className="p-4 border border-white/[0.06] bg-white/[0.01] rounded-2xl space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500 font-medium">Account Title:</span>
                <span className="font-bold text-white">Al-Noor School System</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500 font-medium">Bank Name:</span>
                <span className="font-bold text-white">Habib Bank Limited (HBL)</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500 font-medium">Account Number:</span>
                <span className="font-mono font-bold text-white tracking-wider">0042-3576-1234-019</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Reference Code:</span>
                <span className="font-mono font-bold text-violet-400 tracking-wider">
                  {activeStudent?.admissionNumber || "ADM-2025-001"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl flex items-start gap-2.5 text-xs text-gray-400">
              <Info className="size-4 text-violet-400 shrink-0 mt-0.5" />
              <p className="leading-normal">
                Please transfer **Rs. {feeData?.currentFee?.totalAmount.toLocaleString()}** and write the reference code in the transaction reference block. Principal verifies ledger once submitted.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPayOpen(false)}
                className="border-white/[0.08] hover:bg-white/[0.05] text-xs h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayConfirm}
                disabled={isSubmittingPayment}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 rounded-xl px-5 shadow flex items-center justify-center gap-1.5"
              >
                {isSubmittingPayment ? (
                  <>
                    <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    I Have Paid
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
