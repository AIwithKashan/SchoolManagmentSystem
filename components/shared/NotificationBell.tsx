"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, CreditCard, Award, Megaphone, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationType } from "@prisma/client";

interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  user: {
    id: string;
    role: string;
  };
}

export default function NotificationBell({ user }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const prevCountRef = useRef<number>(0);

  // Poll for unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        const count = data.count || 0;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  // Fetch latest 5 notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Set polling interval (60 seconds)
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation trigger on count increase
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2500);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // Mark all notifications as read
  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Click single notification
  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read in DB if not read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    // Determine target URL based on role and notification type
    const rolePath = user.role.toLowerCase();
    let path = `/${rolePath}/dashboard`;

    switch (notif.type) {
      case "ATTENDANCE":
        if (rolePath === "parent") path = "/parent/attendance";
        else if (rolePath === "teacher") path = "/teacher/attendance";
        else if (rolePath === "principal") path = "/principal/attendance";
        break;
      case "FEE":
        if (rolePath === "parent") path = "/parent/fees";
        else if (rolePath === "principal") path = "/principal/fees";
        break;
      case "GRADE":
        if (rolePath === "parent") path = "/parent/child";
        else if (rolePath === "teacher") path = "/teacher/grades";
        else if (rolePath === "principal") path = "/principal/reports";
        break;
      case "ANNOUNCEMENT":
        if (rolePath === "parent") path = "/parent/announcements";
        else if (rolePath === "principal") path = "/principal/announcements";
        break;
      default:
        break;
    }

    router.push(path);
  };

  // Get icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "ATTENDANCE":
        return <Calendar className="size-4 text-emerald-400" />;
      case "FEE":
        return <CreditCard className="size-4 text-amber-400" />;
      case "GRADE":
        return <Award className="size-4 text-purple-400" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="size-4 text-blue-400" />;
      default:
        return <Bell className="size-4 text-gray-400" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
      <DropdownMenuTrigger
        render={
          <button
            className={`p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all relative shrink-0 focus:outline-none group ${
              isPulsing ? "ring-2 ring-purple-500 bg-purple-500/10 text-white" : ""
            }`}
          />
        }
      >
        {isPulsing && (
          <span className="absolute inset-0 rounded-lg bg-purple-500/20 animate-ping pointer-events-none" />
        )}
        <Bell className={`size-5 transition-transform duration-300 ${isPulsing ? "scale-110 animate-bounce" : "group-hover:rotate-12"}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-gray-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 bg-gray-900/95 backdrop-blur-xl border border-gray-800 text-white p-1.5 shadow-2xl rounded-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-xs font-semibold text-gray-300">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] font-medium text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30 hover:border-purple-500/50 bg-purple-500/10 rounded px-1.5 py-0.5"
            >
              <Check className="size-2.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-gray-800" />
        
        <div className="max-h-72 overflow-y-auto space-y-0.5 my-1">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-xs gap-2">
              <Loader2 className="size-4 animate-spin text-purple-500" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs">
              No notifications available
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-3 p-2.5 hover:bg-gray-800/80 rounded-lg cursor-pointer transition-colors focus:bg-gray-800 focus:outline-none ${
                  !notif.isRead ? "bg-gray-800/30 border-l-2 border-purple-500" : ""
                }`}
              >
                <div className="p-1.5 bg-gray-800 rounded-lg mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold truncate ${!notif.isRead ? "text-white" : "text-gray-300"}`}>
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span className="size-1.5 bg-purple-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.content}
                  </p>
                  <span className="text-[9px] text-gray-500 mt-1 block">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={() => {
            if (user.role === "PARENT") {
              router.push("/parent/notifications");
            } else {
              router.push(`/${user.role.toLowerCase()}/dashboard`);
            }
          }}
          className="text-center text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 py-2 justify-center cursor-pointer rounded-lg transition-all"
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
