import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PrintReceiptButton from "./PrintReceiptButton";

interface ReceiptPageProps {
  params: {
    id: string;
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const feeId = params.id;
  let data: any = null;

  // 1. Resolve receipt details from Database or Mock fallback
  if (feeId.includes("mock")) {
    const monthNum = parseInt(feeId.split("-").pop() || "4");
    const monthName = new Date(2026, monthNum - 1, 1).toLocaleString("en-US", { month: "long" });

    data = {
      schoolName: "Al-Noor School System",
      logo: null,
      address: "123 Education Street, Gulberg III",
      city: "Lahore",
      phone: "042-35761234",
      email: "billing@alnoor.edu.pk",
      website: "www.alnoor.edu.pk",
      studentName: "Ali Ahmed",
      rollNumber: "001",
      admissionNumber: "ADM-2025-001",
      className: "Grade 1 - A",
      receiptNumber: `REC-2026-0${monthNum}1`,
      month: monthName,
      year: 2026,
      paidDate: new Date(2026, monthNum - 1, 5).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      tuitionFee: 4500,
      transportFee: 500,
      totalAmount: 5000,
      paymentMethod: "Bank Transfer (HBL)",
      status: "PAID",
      note: "Term tuition fee invoice cleared.",
    };
  } else {
    const fee = await db.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        school: true,
      },
    });

    if (!fee) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] text-white">
          <p className="text-lg font-bold text-rose-400">Receipt record not found.</p>
        </div>
      );
    }

    const tuitionFee = fee.feeType === "TUITION" ? fee.amount : fee.amount * 0.9;
    const transportFee = fee.amount - tuitionFee;
    const monthName = new Date(fee.year, fee.month - 1, 1).toLocaleString("en-US", { month: "long" });

    data = {
      schoolName: fee.school.name,
      logo: fee.school.logo,
      address: fee.school.address,
      city: fee.school.city,
      phone: fee.school.phone || "042-35761234",
      email: fee.school.email || "info@alnoor.edu.pk",
      website: fee.school.website || "www.alnoor.edu.pk",
      studentName: fee.student.name,
      rollNumber: fee.student.rollNumber || "N/A",
      admissionNumber: fee.student.admissionNumber,
      className: fee.student.class ? `${fee.student.class.name} - ${fee.student.class.section}` : "N/A",
      receiptNumber: fee.receiptNumber || `REC-${fee.year}-0${fee.month}9`,
      month: monthName,
      year: fee.year,
      paidDate: fee.paidAt ? fee.paidAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) : new Date().toLocaleDateString(),
      tuitionFee,
      transportFee: transportFee > 0 ? transportFee : 0,
      totalAmount: fee.amount,
      paymentMethod: "Bank Transfer (Verification Complete)",
      status: fee.status,
      note: fee.note || "Term tuition fee invoice cleared.",
    };
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* CSS Rules to override parent layouts when printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide all surrounding app dashboard layout items */
          body * {
            visibility: hidden;
          }
          /* Print only the receipt card */
          .printable-receipt, .printable-receipt * {
            visibility: visible;
          }
          .printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Ensure text and headings display in print-black */
          .printable-receipt text-white,
          .printable-receipt h1,
          .printable-receipt h2,
          .printable-receipt h3,
          .printable-receipt h4,
          .printable-receipt span,
          .printable-receipt p,
          .printable-receipt td,
          .printable-receipt th {
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Main Print Layout Wrapper */}
      <Card className="glass-card border-white/[0.08] bg-slate-950/40 rounded-2xl shadow-xl overflow-hidden p-8 printable-receipt">
        <CardContent className="p-0 space-y-8">
          
          {/* Receipt Header details */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/[0.08] pb-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span className="size-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">AI</span>
                {data.schoolName}
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-normal">
                {data.address}, {data.city} • {data.phone}
              </p>
            </div>
            
            <div className="text-left sm:text-right space-y-1">
              <h1 className="text-xl font-bold uppercase text-violet-400 tracking-wider">Fee Receipt</h1>
              <p className="text-xs text-gray-500">Receipt No: <strong className="text-gray-300 font-mono">{data.receiptNumber}</strong></p>
              <p className="text-xs text-gray-500">Paid Date: <strong className="text-gray-300">{data.paidDate}</strong></p>
            </div>
          </div>

          {/* Student details context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/[0.01] border border-white/[0.05] rounded-xl p-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-white/[0.02] pb-1">
                <span className="text-gray-500">Student Name:</span>
                <span className="font-bold text-white">{data.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Roll Number:</span>
                <span className="font-semibold text-gray-300">{data.rollNumber}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-white/[0.02] pb-1">
                <span className="text-gray-500">Admission No:</span>
                <span className="font-semibold text-gray-300 font-mono">{data.admissionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Class / Sec:</span>
                <span className="font-bold text-white">{data.className}</span>
              </div>
            </div>
          </div>

          {/* Invoice item breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/[0.06] pb-2">Fee Ledger Details</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-400">
                <thead>
                  <tr className="text-gray-500 border-b border-white/[0.04]">
                    <th className="py-2.5 font-bold">Item Description</th>
                    <th className="py-2.5 font-bold text-center">Billing Cycle</th>
                    <th className="py-2.5 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.03]">
                    <td className="py-3 font-semibold text-white">Tuition Fee</td>
                    <td className="py-3 text-center">{data.month} {data.year}</td>
                    <td className="py-3 text-right text-gray-300">Rs. {data.tuitionFee.toLocaleString()}</td>
                  </tr>
                  {data.transportFee > 0 && (
                    <tr className="border-b border-white/[0.03]">
                      <td className="py-3 font-semibold text-white">Transport route pick/drop charge</td>
                      <td className="py-3 text-center">{data.month} {data.year}</td>
                      <td className="py-3 text-right text-gray-300">Rs. {data.transportFee.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="text-sm font-extrabold text-white">
                    <td className="py-4">Grand Total Cleared</td>
                    <td className="py-4 text-center"></td>
                    <td className="py-4 text-right text-violet-400">Rs. {data.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment method and signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-white/[0.08] pt-6">
            <div className="space-y-2 text-xs">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Payment Particulars</p>
              <p className="text-gray-300 font-semibold">Payment Mode: <span className="text-white">{data.paymentMethod}</span></p>
              <p className="text-gray-300 font-semibold">Status: <span className="text-emerald-400 font-bold uppercase tracking-wider">{data.status} ✅</span></p>
              <p className="text-gray-400 italic text-[11px] mt-1.5 leading-relaxed">&ldquo;{data.note}&rdquo;</p>
            </div>

            <div className="flex flex-col justify-end items-end space-y-4">
              <div className="w-40 border-b border-white/[0.2] h-12" />
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mr-6">Authorized Signatory</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Control Actions Row (Print/Cancel) */}
      <div className="flex items-center justify-between no-print pt-2">
        <PrintReceiptButton />
        <p className="text-xs text-gray-500 font-semibold italic">System Generated Fee Receipt. Valid without physical stamp.</p>
      </div>
    </div>
  );
}
