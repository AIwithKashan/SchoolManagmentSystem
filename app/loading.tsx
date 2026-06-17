import React from "react";
import { GraduationCap, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans z-50">
      
      {/* Background Animated Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-blue-900/20 blur-[130px] animate-pulse duration-[6000ms] ease-in-out" />
        <div className="absolute -bottom-[20%] right-[10%] w-[55%] h-[55%] rounded-full bg-purple-900/20 blur-[130px] animate-pulse duration-[8000ms] ease-in-out" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
        {/* Pulsing Logo Group */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl shadow-indigo-500/25">
            <GraduationCap className="h-8 w-8 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              EduMind <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-black">AI</span>
            </span>
            <div className="text-[10px] tracking-widest text-blue-400 font-extrabold uppercase">Next-Gen EdTech</div>
          </div>
        </div>

        {/* Loading Spinner and Text */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    </div>
  );
}
