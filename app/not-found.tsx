import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { GraduationCap, Home, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NotFound() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role; // PRINCIPAL, TEACHER, PARENT

  let dashboardUrl = "/";
  let roleLabel = "Home";

  if (role === "PRINCIPAL") {
    dashboardUrl = "/principal";
    roleLabel = "Principal Dashboard";
  } else if (role === "TEACHER") {
    dashboardUrl = "/teacher";
    roleLabel = "Teacher Dashboard";
  } else if (role === "PARENT") {
    dashboardUrl = "/parent";
    roleLabel = "Parent Dashboard";
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-6 text-center">
      
      {/* Background Animated Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Deep Blue Blob */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/25 blur-[120px] animate-pulse duration-[8000ms] ease-in-out" />
        {/* Purple Blob */}
        <div className="absolute top-[30%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[130px] animate-pulse duration-[10000ms] ease-in-out" />
        {/* Deep Indigo Blob */}
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse duration-[9000ms] ease-in-out" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* School Icon */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl shadow-indigo-500/20 mx-auto animate-bounce">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            404
          </h1>
          <h2 className="text-xl font-bold text-slate-200">Page Not Found</h2>
          <p className="text-slate-400 text-sm leading-relaxed pt-2">
            This page seems to have gone on leave 😄
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          {session?.user ? (
            <Link href={dashboardUrl}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold h-10 px-5 w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30">
                <span>Go to {roleLabel}</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold h-10 px-5 w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30">
                  <LogIn className="size-4" />
                  <span>Login</span>
                </Button>
              </Link>
              <Link href="/">
                <Button className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold h-10 px-5 w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer">
                  <Home className="size-4" />
                  <span>Go Home</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
