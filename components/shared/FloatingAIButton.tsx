"use client";

import React, { useState } from "react";
import { Brain, Send, Bot } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingAIButtonProps {
  userRole: string;
}

export default function FloatingAIButton({ userRole }: FloatingAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getAiTitle = (role: string) => {
    switch (role) {
      case "PRINCIPAL":
        return "Afia - Principal AI";
      case "TEACHER":
        return "Nova - Teacher AI";
      case "PARENT":
        return "Care - Parent AI";
      default:
        return "EduMind AI Assistant";
    }
  };

  return (
    <TooltipProvider delay={100}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {/* Tooltip trigger wrapped around sheet button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <SheetTrigger
                render={
                  <button
                    className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 lg:hidden z-[100] w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-[0_0_20px_rgba(124,58,237,0.6)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group border border-purple-500/30"
                    aria-label="Ask AI Assistant"
                  />
                }
              />
            }
          >
            {/* Pulsing ring outline */}
            <span className="absolute inset-0 rounded-full border border-purple-500/50 animate-ping opacity-75 pointer-events-none" />
            
            <Brain className="size-6 text-white group-hover:rotate-12 transition-transform duration-200" />
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="bg-gray-950 text-white border border-gray-800 shadow-md mb-2">
            Ask AI Assistant
          </TooltipContent>
        </Tooltip>

        {/* Bottom Sheet Drawer for mobile chat view */}
        <SheetContent
          side="bottom"
          className="h-[80vh] rounded-t-2xl border-t border-gray-800 bg-gray-950 text-white p-6 flex flex-col justify-between"
        >
          <SheetHeader className="border-b border-gray-900 pb-3 flex flex-row items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
              <Bot className="size-4.5 text-purple-400" />
            </div>
            <SheetTitle className="text-white text-base font-semibold leading-none">
              {getAiTitle(userRole)}
            </SheetTitle>
          </SheetHeader>

          {/* Simple chat UI placeholder */}
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 py-10">
            <span className="text-xs">Start a conversation...</span>
            <span className="text-[10px] text-purple-400 mt-2 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full select-none font-medium">
              AI features coming soon
            </span>
          </div>

          {/* Input field area */}
          <div className="flex gap-2 border-t border-gray-900 pt-4 items-center">
            <Input
              placeholder="Ask anything..."
              className="flex-1 bg-gray-900 border-gray-800 text-white h-10 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/10 placeholder:text-muted-foreground/30"
            />
            <Button
              size="icon"
              className="bg-purple-600 hover:bg-purple-500 text-white size-10 shrink-0 shadow-lg shadow-purple-500/15"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
