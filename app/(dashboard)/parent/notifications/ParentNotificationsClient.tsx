"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  Bell,
  BellOff,
  BookOpen,
  CalendarCheck2,
  CheckSquare,
  CreditCard,
  Loader2,
  Megaphone
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface Notification {
  id: string;
  userId: string;
  schoolId: string;
  title: string;
  content: string;
  type: "ATTENDANCE" | "FEE" | "GRADE" | "ANNOUNCEMENT" | "GENERAL";
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ParentNotificationsClientProps {
  userId: string;
}

type TabType = "ALL" | "ATTENDANCE" | "FEE" | "GRADE" | "ANNOUNCEMENT";

export default function ParentNotificationsClient({
  userId,
}: ParentNotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<TabType>("ALL");

  // 1. Fetch paginated notifications
  const fetchNotifications = async (pageNum: number, silent = false) => {
    if (pageNum === 1 && !silent) setLoading(true);
    if (pageNum > 1) setLoadingMore(true);

    try {
      const res = await fetch(`/api/parent/notifications/${userId}?page=${pageNum}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();

      if (pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not load notifications.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [userId]);

  // Load more trigger
  const handleLoadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/parent/notifications/mark-all-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error("Failed to mark all as read");

      // Update local state to show all read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true, readAt: new Date().toISOString() }))
      );
      toast.success("All notifications marked as read!");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not update notifications status.");
    }
  };

  // Handle single notification click (Mark read + Navigate)
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );

        await fetch("/api/parent/notifications/mark-read", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif.id }),
        });
      } catch (err: any) {
        console.error("Mark read sync error:", err);
      }
    }

    // Resolve redirection path based on type
    let redirectPath = "/parent/dashboard";
    switch (notif.type) {
      case "ATTENDANCE":
        redirectPath = "/parent/attendance";
        break;
      case "FEE":
        redirectPath = "/parent/fees";
        break;
      case "GRADE":
        redirectPath = "/parent/student-corner"; // opens results page tab
        break;
      case "ANNOUNCEMENT":
        redirectPath = "/parent/announcements";
        break;
      case "GENERAL":
      default:
        // Try parsing context to check for assignments etc.
        if (notif.title.toLowerCase().includes("homework") || notif.title.toLowerCase().includes("assignment")) {
          redirectPath = "/parent/student-corner";
        } else {
          redirectPath = "/parent/dashboard";
        }
        break;
    }

    router.push(redirectPath);
  };

  // Helper for notification type configs
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "ATTENDANCE":
        return {
          icon: CalendarCheck2,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      case "FEE":
        return {
          icon: CreditCard,
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        };
      case "GRADE":
        return {
          icon: Award,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        };
      case "ANNOUNCEMENT":
        return {
          icon: Megaphone,
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        };
      case "GENERAL":
      default:
        return {
          icon: BookOpen,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };
    }
  };

  // Filter list by Tab
  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "ALL") return true;
    return notif.type === activeTab;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="size-8 text-blue-400" />
            Notification Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review academic logs, alerts, invoices, and attendance notifications.
          </p>
        </div>

        {/* Mark All Read Button */}
        <button
          onClick={handleMarkAllRead}
          disabled={notifications.length === 0 || !notifications.some((n) => !n.isRead)}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/10 transition-colors self-start sm:self-auto"
        >
          <CheckSquare className="size-4" />
          Mark All Read
        </button>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex border-b border-white/[0.06] gap-6 overflow-x-auto scrollbar-none">
        {[
          { id: "ALL", label: "All Alerts", icon: Bell },
          { id: "ATTENDANCE", label: "Attendance", icon: CalendarCheck2 },
          { id: "FEE", label: "Fees & Dues", icon: CreditCard },
          { id: "GRADE", label: "Academic Grades", icon: Award },
          { id: "ANNOUNCEMENT", label: "Announcements", icon: Megaphone },
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

      {/* ── Feed Timeline ── */}
      {loading ? (
        <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl p-12 text-center text-gray-500 text-sm">
          Loading alerts logs...
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="All Caught Up!"
          description="You have no new notifications"
          actionLabel={null}
          onAction={null}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const config = getTypeConfig(notif.type);
            const Icon = config.icon;

            return (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full text-left border rounded-xl bg-gray-900/60 backdrop-blur-xl hover:border-white/[0.1] transition-all p-4 flex items-start gap-4 relative overflow-hidden group ${
                  notif.isRead
                    ? "border-white/[0.06] opacity-75"
                    : "border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.03)]"
                }`}
              >
                {/* Unread indicator bar */}
                {!notif.isRead && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500" />
                )}

                {/* Icon category */}
                <div className={`p-2.5 rounded-xl border shrink-0 ${config.color}`}>
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {notif.content}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Load More Controller */}
          {page < totalPages && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading alerts...
                  </>
                ) : (
                  "Load More Notifications"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
