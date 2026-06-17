"use client";

import { toast } from "sonner";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Search, Bell, Sparkles, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/shared/NotificationBell";

interface TopNavbarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    schoolId: string | null;
    avatar: string | null;
  };
  onMobileSidebarToggle: () => void;
}

export default function TopNavbar({ user, onMobileSidebarToggle }: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getPageTitle = (path: string) => {
    if (path === "/") return "Home";
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Dashboard";
    const last = segments[segments.length - 1];

    const titleMap: Record<string, string> = {
      dashboard: "Dashboard",
      students: "Students",
      teachers: "Teachers",
      classes: "Classes",
      attendance: "Attendance",
      exams: "Examinations",
      fees: "Fee Management",
      announcements: "Announcements",
      reports: "Reports",
      settings: "Settings",
      ai: "AI Assistant",
      child: "My Child",
      homework: "Homework",
      lessons: "Lesson Plans",
      messages: "Messages",
      grades: "Grades",
      "student-corner": "Student Corner",
    };

    return titleMap[last.toLowerCase()] || last.charAt(0).toUpperCase() + last.slice(1);
  };

  const getBreadcrumbs = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    const capitalizedSegments = segments.map((seg) => {
      const lower = seg.toLowerCase();
      if (lower === "principal") return "Principal";
      if (lower === "teacher") return "Teacher";
      if (lower === "parent") return "Parent";
      if (lower === "ai") return "AI";
      return getPageTitle("/" + seg);
    });
    return ["EduMind AI", ...capitalizedSegments].join("  ›  ");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <TooltipProvider delay={100}>
      <div className="h-16 w-full border-b border-border bg-card/80 backdrop-blur-xl px-6 flex items-center justify-between text-foreground sticky top-0 z-50">
        {/* Left Side: Mobile Menu, Page Title & Breadcrumbs */}
        <div className="flex items-center min-w-0">
          <button
            onClick={onMobileSidebarToggle}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors mr-2 shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="size-6" />
          </button>
          
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-semibold text-foreground leading-none truncate">
              {getPageTitle(pathname)}
            </h1>
            <span className="hidden md:block text-[10px] text-muted-foreground mt-1 select-none">
              {getBreadcrumbs(pathname)}
            </span>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Dropdowns */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => toast.info("Search feature coming soon!")}
                  className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
                >
                  <Search className="size-5" />
                </button>
              }
            />
            <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-md">
              Search
            </TooltipContent>
          </Tooltip>

          {/* Notifications Dropdown (Interactive Bell) */}
          <NotificationBell user={user} />

          {/* AI Pulsing Button (Desktop Only) */}
          <Button
            onClick={() => toast.info("Nova AI is initializing... 🤖")}
            className="hidden lg:flex bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs px-3 h-8 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 transition-all duration-300 gap-1.5 items-center relative overflow-hidden group shrink-0"
          >
            <Sparkles className="size-3.5 text-purple-200 animate-pulse" />
            <span>Ask AI</span>
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-1.5 focus:outline-none shrink-0 group">
                  <Avatar size="default" className="border border-border group-hover:border-border/80 transition-colors">
                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? "User"} /> : null}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(user.name ?? "User")}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border text-popover-foreground p-1 shadow-xl">
              <DropdownMenuLabel className="flex flex-col px-2.5 py-2">
                <span className="text-sm font-semibold text-foreground truncate">{user.name ?? "User"}</span>
                <span className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => toast.info("Profile settings panel opening...")}
                className="px-2.5 py-2 hover:bg-muted rounded-md cursor-pointer text-xs"
              >
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Settings panel opening...")}
                className="px-2.5 py-2 hover:bg-muted rounded-md cursor-pointer text-xs"
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-2.5 py-2 hover:bg-destructive/10 text-destructive rounded-md cursor-pointer text-xs"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
