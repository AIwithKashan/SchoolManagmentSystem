"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSidebarStore } from "@/hooks/useSidebarStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  CalendarCheck2,
  CalendarDays,
  FileSpreadsheet,
  CreditCard,
  Megaphone,
  BarChart3,
  Settings,
  Sparkles,
  BookOpen,
  Award,
  MessageSquare,
  FileText,
  Home,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  userName: string;
  userRole: "PRINCIPAL" | "TEACHER" | "PARENT";
  userAvatar: string | null;
  schoolName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  userName,
  userRole,
  userAvatar,
  schoolName,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Define navigation configuration based on role
  const getNavItems = () => {
    switch (userRole) {
      case "PRINCIPAL":
        return [
          { label: "Dashboard", href: "/principal/dashboard", icon: LayoutDashboard },
          { label: "Students", href: "/principal/students", icon: GraduationCap },
          { label: "Teachers", href: "/principal/teachers", icon: Users },
          { label: "Classes", href: "/principal/classes", icon: School },
          { label: "Attendance", href: "/principal/attendance", icon: CalendarCheck2 },
          { label: "Examinations", href: "/principal/exams", icon: FileSpreadsheet },
          { label: "Fee Management", href: "/principal/fees", icon: CreditCard },
          { label: "Announcements", href: "/principal/announcements", icon: Megaphone },
          { label: "Reports", href: "/principal/reports", icon: BarChart3 },
          { label: "Settings", href: "/principal/settings", icon: Settings },
          { label: "AI Assistant", href: "/principal/ai", icon: Sparkles, isAi: true },
        ];
      case "TEACHER":
        return [
          { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
          { label: "My Classes", href: "/teacher/classes", icon: School },
          { label: "Attendance", href: "/teacher/attendance", icon: CalendarDays },
          { label: "Assignments", href: "/teacher/assignments", icon: BookOpen },
          { label: "Grades", href: "/teacher/grades", icon: Award },
          { label: "Messages", href: "/teacher/messages", icon: MessageSquare },
          { label: "Lesson Plans", href: "/teacher/lessons", icon: FileText },
          { label: "Ask Nova (AI)", href: "/teacher/ai", icon: Sparkles, isAi: true },
        ];
      case "PARENT":
        return [
          { label: "Home", href: "/parent/dashboard", icon: Home },
          { label: "My Child", href: "/parent/child", icon: User },
          { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
          { label: "Homework", href: "/parent/homework", icon: BookOpen },
          { label: "Fee Status", href: "/parent/fees", icon: CreditCard },
          { label: "Messages", href: "/parent/messages", icon: MessageSquare },
          { label: "Announcements", href: "/parent/announcements", icon: Megaphone },
          { label: "Student Corner", href: "/parent/student-corner", icon: GraduationCap },
          { label: "Ask Care (AI)", href: "/parent/ai", icon: Sparkles, isAi: true },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <TooltipProvider delay={100}>
      <div
        className={cn(
          "h-screen bg-card border-r border-border/80 flex flex-col justify-between p-4 transition-all duration-300 select-none",
          isCollapsed ? "w-[70px]" : "w-[260px]",
          "fixed inset-y-0 left-0 z-50 lg:static lg:flex",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <GraduationCap className="size-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-foreground tracking-tight leading-none truncate">
                    EduMind <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 font-extrabold">AI</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[130px] mt-1" title={schoolName}>
                    {schoolName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex size-7 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted items-center justify-center transition-all duration-200"
              >
                {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden size-7 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-all duration-200"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* User Profile Block */}
          <div
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 transition-all duration-200",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <Avatar size="default" className="border border-border shadow-sm shrink-0">
              {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate max-w-[130px]" title={userName}>
                  {userName}
                </span>
                <div className="pt-0.5">
                  {userRole === "PRINCIPAL" && (
                    <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full">
                      Principal
                    </Badge>
                  )}
                  {userRole === "TEACHER" && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full">
                      Teacher
                    </Badge>
                  )}
                  {userRole === "PARENT" && (
                    <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full">
                      Parent
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6 space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-muted">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  item.isAi
                    ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-600 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                    : isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  isCollapsed ? "justify-center" : ""
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    item.isAi
                      ? "text-purple-500 animate-pulse"
                      : isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    render={
                      <div className="w-full flex justify-center">
                        {linkContent}
                      </div>
                    }
                  />
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border border-border shadow-md">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.href}>{linkContent}</React.Fragment>;
          })}
        </div>

        {/* Footer Section */}
        <div className="pt-4 border-t border-border/60 space-y-1">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full group"
                  >
                    <LogOut className="size-5 text-muted-foreground group-hover:text-destructive shrink-0" />
                  </button>
                }
              />
              <TooltipContent side="right" className="bg-popover text-popover-foreground border border-border shadow-md">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full text-left group"
            >
              <LogOut className="size-5 text-muted-foreground group-hover:text-destructive shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
