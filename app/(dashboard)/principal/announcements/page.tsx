"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/navigation";
import LinkNext from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  Eye,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────
interface ClassItem {
  id: string;
  name: string;
  section: string;
  displayName: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetRole: "ALL" | "TEACHER" | "PARENT" | "STUDENT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    name: string;
    email: string;
    avatar: string | null;
  };
}

interface StatsSummary {
  total: number;
  active: number;
  teacherTargets: number;
  parentTargets: number;
}

// ─── Constants ─────────────────────────────────────────────────────────
const TARGET_ROLE_BADGES: Record<string, string> = {
  ALL: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  TEACHER: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  PARENT: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  STUDENT: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

const TARGET_ROLE_LABELS: Record<string, string> = {
  ALL: "Everyone",
  TEACHER: "Teachers",
  PARENT: "Parents",
  STUDENT: "Students",
};

export default function AnnouncementsPage() {
  const router = useRouter();
  // ─── State Management ───────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    total: 0,
    active: 0,
    teacherTargets: 0,
    parentTargets: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ─── Dialog Controls ────────────────────────────────────────────────
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);

  // ─── Target Selections ──────────────────────────────────────────────
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  // ─── Form Fields ────────────────────────────────────────────────────
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTargetRole, setFormTargetRole] = useState<"ALL" | "TEACHER" | "PARENT" | "STUDENT">("ALL");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);

  // ─── API: Fetch Classes ─────────────────────────────────────────────
  const loadClasses = async () => {
    try {
      const res = await fetch("/api/principal/classes");
      const data = await res.json();
      if (res.ok && data.classes) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // ─── API: Fetch Announcements ───────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        targetRole: roleFilter,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/principal/announcements?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load notices");

      setAnnouncements(data.announcements);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      toast.error(err.message || "Error fetching announcements");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, limit]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ─── Reset Page on Filter changes ──────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, limit]);

  // ─── Metadata Parser Helper ─────────────────────────────────────────
  const parseContent = (item: AnnouncementItem) => {
    let text = item.content;
    let label = TARGET_ROLE_LABELS[item.targetRole] || "General";
    let badgeColor = TARGET_ROLE_BADGES[item.targetRole] || "";
    let scheduledTime = "";

    if (item.content.startsWith("{") && item.content.includes(" |CONTENT| ")) {
      try {
        const parts = item.content.split(" |CONTENT| ");
        const meta = JSON.parse(parts[0]);
        text = parts[1];

        if (meta.classId) {
          const matched = classes.find((c) => c.id === meta.classId);
          label = matched ? `Class: ${matched.displayName}` : "Specific Class";
          badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
        }
        if (meta.scheduledAt) {
          scheduledTime = new Date(meta.scheduledAt).toLocaleString();
        }
      } catch (e) {
        console.error(e);
      }
    }

    return { text, label, badgeColor, scheduledTime };
  };

  // ─── API: Edit Announcement ─────────────────────────────────────────
  const handleOpenEdit = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    const parsed = parseContent(item);
    setFormTitle(item.title);
    setFormContent(parsed.text);
    setFormTargetRole(item.targetRole);
    setFormIsActive(item.isActive);
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Please fill out all required fields");
      return;
    }

    try {
      setSubmittingForm(true);

      // Preserve metadata prefixes if originally present
      let finalContent = formContent.trim();
      if (selectedAnnouncement.content.startsWith("{") && selectedAnnouncement.content.includes(" |CONTENT| ")) {
        const parts = selectedAnnouncement.content.split(" |CONTENT| ");
        finalContent = `${parts[0]} |CONTENT| ${formContent.trim()}`;
      }

      const res = await fetch(`/api/principal/announcements/${selectedAnnouncement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          content: finalContent,
          targetRole: formTargetRole,
          isActive: formIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update notice");

      toast.success("Announcement updated successfully");
      setOpenEditDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to save updates");
    } finally {
      setSubmittingForm(false);
    }
  };

  // ─── API: Quick Toggle Active State ────────────────────────────────
  const handleToggleActive = async (item: AnnouncementItem) => {
    const updatedState = !item.isActive;
    try {
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === item.id ? { ...ann, isActive: updatedState } : ann))
      );

      const res = await fetch(`/api/principal/announcements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: updatedState }),
      });

      if (!res.ok) throw new Error("Server update failed");
      toast.success(`Announcement ${updatedState ? "activated" : "deactivated"}`);

      setStats((prev) => ({
        ...prev,
        active: prev.active + (updatedState ? 1 : -1),
      }));
    } catch {
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === item.id ? { ...ann, isActive: !updatedState } : ann))
      );
      toast.error("Failed to toggle announcement status");
    }
  };

  // ─── API: Delete Announcement ───────────────────────────────────────
  const handleOpenDelete = (id: string) => {
    setAnnouncementToDelete(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      const res = await fetch(`/api/principal/announcements/${announcementToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete announcement");
      }

      toast.success("Announcement deleted successfully");
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Could not delete notice");
    } finally {
      setOpenDeleteDialog(false);
      setAnnouncementToDelete(null);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Megaphone className="size-8 text-purple-400" />
            School Announcements
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Post, broadcast, and manage announcements for teachers, parents, and students.
          </p>
        </div>
        <LinkNext href="/principal/announcements/new">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Plus className="size-4" />
            Post Announcement
          </Button>
        </LinkNext>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Broadcasts</span>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Megaphone className="size-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Bulletins</span>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="size-5 text-emerald-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Teacher Targeted</span>
              <p className="text-2xl font-bold text-purple-400">{stats.teacherTargets}</p>
            </div>
            <div className="size-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Users className="size-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-800 bg-slate-900/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Targeted</span>
              <p className="text-2xl font-bold text-amber-400">{stats.parentTargets}</p>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <User className="size-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="glass-card border-gray-800 p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements by title or content keywords..."
            className="pl-9 bg-slate-950/60 border-gray-800 text-gray-100 placeholder:text-gray-500 h-10"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="relative w-full sm:w-44">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Audiences</option>
              <option value="ALL">Everyone</option>
              <option value="TEACHER">Teachers Only</option>
              <option value="PARENT">Parents Only</option>
              <option value="STUDENT">Students Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative w-full sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 outline-none h-10 appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 size-4 text-gray-500 pointer-events-none" />
          </div>

          {(search || roleFilter !== "all" || statusFilter !== "all") && (
            <Button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              variant="outline"
              className="border-gray-850 hover:bg-slate-800 text-gray-400 hover:text-white h-10 text-xs px-3"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Announcements Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 text-purple-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium">Fetching announcement logs...</span>
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Announcements"
          description="Keep parents informed with announcements"
          actionLabel="Create Announcement"
          onAction={() => router.push("/principal/announcements/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((item) => {
            const parsed = parseContent(item);
            return (
              <Card
                key={item.id}
                className={cn(
                  "glass-card border-gray-800/80 bg-slate-900/30 flex flex-col justify-between overflow-hidden shadow-md group hover:border-gray-700 transition duration-200",
                  !item.isActive && "opacity-60 border-dashed border-gray-850 bg-slate-950/20"
                )}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border shrink-0", parsed.badgeColor)}>
                      Target: {parsed.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      <Calendar className="size-3 shrink-0" />
                      {formatDate(item.createdAt)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3
                      onClick={() => {
                        setSelectedAnnouncement(item);
                        setOpenPreviewDialog(true);
                      }}
                      className="text-base font-bold text-white hover:text-purple-400 transition cursor-pointer line-clamp-1"
                    >
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                      {parsed.text}
                    </p>
                    {parsed.scheduledTime && (
                      <p className="text-[10px] text-purple-400 font-bold mt-1.5 flex items-center gap-1">
                        ⏱️ Scheduled for: {parsed.scheduledTime}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-slate-950/40 border-t border-gray-800/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-6 rounded-full bg-slate-800 border border-gray-700 flex items-center justify-center font-bold text-[9px] text-gray-400 shrink-0 uppercase">
                      {item.createdBy.name.substring(0, 2)}
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium truncate">
                      {item.createdBy.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 mr-1">
                      <span className="text-[10px] text-gray-500 hidden sm:inline">{item.isActive ? "Active" : "Draft"}</span>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item)}
                        className="scale-75 origin-right data-[state=checked]:bg-emerald-600 border-gray-850"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedAnnouncement(item);
                        setOpenPreviewDialog(true);
                      }}
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20"
                    >
                      <Eye className="size-3.5" />
                    </Button>

                    <Button
                      onClick={() => handleOpenEdit(item)}
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-white border border-yellow-500/20"
                    >
                      <Pencil className="size-3.5" />
                    </Button>

                    <Button
                      onClick={() => handleOpenDelete(item.id)}
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalRecords > 0 && (
        <div className="glass-card border-gray-800/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 mt-6">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="bg-slate-950/60 border border-gray-800 rounded px-2 py-1 text-xs text-gray-250 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>notices of {totalRecords} records</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="h-8 border-gray-800 bg-slate-900/40 text-gray-300 disabled:opacity-50 text-[11px]"
            >
              Previous
            </Button>
            <div className="px-3 py-1 bg-slate-950 rounded font-semibold text-gray-300 border border-gray-800/60">
              Page {page} of {totalPages}
            </div>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              className="h-8 border-gray-800 bg-slate-900/40 text-gray-300 disabled:opacity-50 text-[11px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="bg-slate-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="size-5 text-yellow-400" />
              Edit Announcement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-semibold text-gray-400">Notice Title</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-slate-950 text-white border-gray-850 h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="text-xs font-semibold text-gray-400">Target Audience</Label>
              <select
                id="edit-role"
                value={formTargetRole}
                onChange={(e) => setFormTargetRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-gray-850 rounded-md px-3 py-2 text-xs text-gray-250 outline-none h-9 focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">Everyone</option>
                <option value="TEACHER">Teachers Only</option>
                <option value="PARENT">Parents Only</option>
                <option value="STUDENT">Students Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-content" className="text-xs font-semibold text-gray-400">Announcement Body</Label>
              <textarea
                id="edit-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-gray-855 rounded-md px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 outline-none"
                required
              ></textarea>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-gray-855 rounded-lg">
              <div>
                <p className="text-xs font-bold text-gray-200">Broadcast Notice</p>
                <p className="text-[10px] text-gray-500">Uncheck this to retract this notice into draft status.</p>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                className="data-[state=checked]:bg-emerald-600 border-gray-850 scale-90"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  setOpenEditDialog(false);
                  setSelectedAnnouncement(null);
                }}
                variant="outline"
                className="border-gray-850 text-gray-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingForm}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium"
              >
                {submittingForm ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPreviewDialog} onOpenChange={setOpenPreviewDialog}>
        <DialogContent className="bg-slate-900 border border-gray-850 text-white max-w-md p-6">
          {selectedAnnouncement && (() => {
            const parsed = parseContent(selectedAnnouncement);
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3">
                  <div className="space-y-1">
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border", parsed.badgeColor)}>
                      Audience: {parsed.label}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
                      {selectedAnnouncement.title}
                    </h3>
                  </div>
                </div>

                <div className="py-2 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1">
                  {parsed.text}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-gray-400" />
                    <span>Posted by: <span className="text-gray-350 font-bold">{selectedAnnouncement.createdBy.name}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-gray-450" />
                    <span>{formatDate(selectedAnnouncement.createdAt)}</span>
                  </div>
                </div>

                <DialogFooter className="pt-2 no-print">
                  <Button
                    onClick={() => {
                      setOpenPreviewDialog(false);
                      setSelectedAnnouncement(null);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4"
                  >
                    Close Notice
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border border-gray-800 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-white">
              Remove Announcement?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-xs mt-1.5 leading-relaxed">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => {
                setOpenDeleteDialog(false);
                setAnnouncementToDelete(null);
              }}
              className="border-gray-800 text-gray-400 hover:bg-slate-800 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAnnouncement}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
