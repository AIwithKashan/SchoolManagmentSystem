"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { useSidebarStore } from "@/hooks/useSidebarStore";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FloatingAIButton } from "@/components/shared";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userName: string;
  userRole: "PRINCIPAL" | "TEACHER" | "PARENT";
  userAvatar: string | null;
  schoolName: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    schoolId: string | null;
    avatar: string | null;
  };
}

export default function DashboardLayoutClient({
  children,
  userName,
  userRole,
  userAvatar,
  schoolName,
  user,
}: DashboardLayoutClientProps) {
  const { isCollapsed } = useSidebarStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar drawer whenever route path changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar - fixed on desktop, hidden on mobile */}
      <aside
        className={cn(
          "hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        <Sidebar
          userName={userName}
          userRole={userRole}
          userAvatar={userAvatar}
          schoolName={schoolName}
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 bg-card border-r border-border w-[280px]" showCloseButton={false}>
          <Sidebar
            userName={userName}
            userRole={userRole}
            userAvatar={userAvatar}
            schoolName={schoolName}
            isOpen={isMobileOpen}
            onClose={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Layout Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? "lg:pl-[70px]" : "lg:pl-[260px]"
        )}
      >
        {/* Top Navbar */}
        <header
          className={cn(
            "fixed top-0 right-0 left-0 z-20 transition-all duration-300",
            isCollapsed ? "lg:left-[70px]" : "lg:left-[260px]"
          )}
        >
          <TopNavbar user={user} onMobileSidebarToggle={() => setIsMobileOpen(true)} />
        </header>

        {/* Content Area */}
        <main className="flex-1 pt-16 overflow-y-auto bg-background p-3 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant Button for mobile */}
      <FloatingAIButton userRole={userRole} />
    </div>
  );
}
