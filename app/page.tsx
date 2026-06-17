import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  GraduationCap, 
  Sparkles, 
  Users, 
  BookOpen, 
  LineChart, 
  Mail,
  School,
  ArrowRight,
  Brain,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between font-sans">
      
      {/* 3D Animated Background Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px] animate-pulse duration-[8000ms] ease-in-out" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[140px] animate-pulse duration-[10000ms] ease-in-out" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse duration-[9000ms] ease-in-out" />
        {/* Premium Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%) opacity-40" />
      </div>

      {/* Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-6 w-6 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-bounce" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              EduMind <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI</span>
            </span>
            <div className="text-[10px] tracking-widest text-blue-400 font-bold uppercase">Next-Gen EdTech</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex text-xs text-slate-400 bg-white/[0.03] border border-white/10 rounded-full px-3 py-1 items-center gap-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
            Empowering Pakistani Schools
          </span>
          <Link 
            href="/login?email=principal@edumind.com"
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all backdrop-blur-md"
          >
            Login Portal
          </Link>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20 z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs md:text-sm font-semibold tracking-wide backdrop-blur-lg">
              <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
              <span>🇵🇰 Pakistan&apos;s First AI-Powered SMS</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Rethinking Education through{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-[0_2px_10px_rgba(59,130,246,0.2)] animate-pulse">
                Intelligence
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-400 font-medium leading-relaxed max-w-2xl">
              Seamless administration, intelligent classrooms, and engaged parenting. Bring advanced data metrics and AI assistance to your school today.
            </p>

            {/* Email Access Capture */}
            <div className="w-full max-w-md pt-2">
              <form className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-xl focus-within:border-blue-500/40 transition-all duration-300">
                <input 
                  type="email" 
                  placeholder="Enter your school email" 
                  required
                  className="flex-1 px-4 py-3 bg-transparent text-white placeholder-slate-500 rounded-lg focus:outline-none text-sm"
                />
                <button 
                  type="button"
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 group active:scale-[0.98]"
                >
                  <span>Request Demo</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </form>
              <div className="mt-3 flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Free Demo on Launch
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Secure Data Storage
                </span>
              </div>
            </div>
          </div>

          {/* Right 3D Visual Render Column */}
          <div className="lg:col-span-5 relative w-full flex justify-center items-center">
            {/* Holographic light ring backdrop */}
            <div className="absolute w-[90%] h-[90%] rounded-full border border-blue-500/10 bg-blue-500/5 blur-xl animate-pulse duration-[5000ms] pointer-events-none" />
            <div className="relative w-full max-w-[450px] aspect-[4/3] rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl hover:scale-[1.02] transition-transform duration-500">
              <Image 
                src="/school_3d_render.png" 
                alt="EduMind AI 3D Render Illustration" 
                fill 
                className="object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </div>
          </div>

        </div>

        {/* Stakeholder Roles Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-20">
          
          {/* Principal Card */}
          <Link href="/login?email=principal@edumind.com" className="cursor-pointer group">
            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/20 hover:shadow-[0_8px_30px_rgba(59,130,246,0.05)] p-6 md:p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <LineChart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Principals & Admins</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Unlock campus analytics, automate scheduling, streamline fee collections, and forecast resource requirements with advanced AI modelling.
                </p>
              </div>
              <div className="text-xs text-blue-400 font-semibold tracking-wider uppercase mt-4 flex items-center gap-1.5">
                <span>Enter Admin Portal</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Teacher Card */}
          <Link href="/login?email=teacher@edumind.com" className="cursor-pointer group">
            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/20 hover:shadow-[0_8px_30px_rgba(168,85,247,0.05)] p-6 md:p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Teachers</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Draft customized curriculum lesson plans, auto-grade homework assessments, and monitor student metrics through intuitive dashboards.
                </p>
              </div>
              <div className="text-xs text-purple-400 font-semibold tracking-wider uppercase mt-4 flex items-center gap-1.5">
                <span>Enter Teacher Portal</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Parent Card */}
          <Link href="/login?email=parent@edumind.com" className="cursor-pointer group">
            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-indigo-500/20 hover:shadow-[0_8px_30px_rgba(99,102,241,0.05)] p-6 md:p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Parents</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Gain real-time insights on your child&apos;s behavior and learning, receive automated reports, and pay school fees instantly.
                </p>
              </div>
              <div className="text-xs text-indigo-400 font-semibold tracking-wider uppercase mt-4 flex items-center gap-1.5">
                <span>Enter Parent Portal</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full border-t border-white/[0.06] bg-[#030712]/80 backdrop-blur-md z-10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <School className="h-4 w-4" />
            <span>© 2026 EduMind AI. Built for the future of Pakistan&apos;s education.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="mailto:info@edumind.ai" className="hover:text-slate-300 flex items-center gap-1.5 transition-colors">
              <Mail className="h-3.5 w-3.5" /> Contact Us
            </a>
            <span className="text-slate-700">|</span>
            <span>Made with ❤️ in Pakistan</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
