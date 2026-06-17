"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roleBadge, setRoleBadge] = useState<{ label: string; color: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    if (emailParam) {
      setValue("email", emailParam);
    }
  }, [emailParam, setValue]);

  const emailValue = watch("email");

  useEffect(() => {
    if (!emailValue) {
      setRoleBadge(null);
      return;
    }
    const emailLower = emailValue.toLowerCase();
    if (emailLower.includes("principal")) {
      setRoleBadge({
        label: "Principal Portal",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      });
    } else if (emailLower.includes("teacher")) {
      setRoleBadge({
        label: "Teacher Portal",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      });
    } else if (emailLower.includes("parent")) {
      setRoleBadge({
        label: "Parent Portal",
        color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      });
    } else {
      setRoleBadge(null);
    }
  }, [emailValue]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg(res.error || "Invalid email or password");
        toast.error(res.error || "Invalid email or password");
        setIsLoading(false);
      } else {
        toast.success("Welcome back! Redirecting...");
        
        // Fetch session to determine destination dashboard
        const session = await getSession();
        const role = session?.user?.role;

        if (role === "PRINCIPAL") {
          router.push("/principal/dashboard");
        } else if (role === "TEACHER") {
          router.push("/teacher/dashboard");
        } else if (role === "PARENT") {
          router.push("/parent/dashboard");
        } else if (role === "SUPER_ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">
      {/* Dynamic light glows */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="flex flex-col items-center justify-center space-y-2 mb-6">
        <div className="size-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg
            className="size-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          EduMind <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
        </h2>
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/80 uppercase">
          School Management System
        </p>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive-foreground animate-shake">
          <AlertCircle className="size-5 shrink-0 text-red-500 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={cn(
                "pl-9 bg-white/[0.02] border-white/10 text-white h-10 placeholder:text-muted-foreground/40 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/10",
                errors.email && "border-destructive/50 focus-visible:border-destructive"
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}

          {/* Dynamic Role Badge */}
          {roleBadge && (
            <div className="pt-1 animate-fade-in">
              <Badge className={cn("px-2.5 py-0.5 text-[11px] font-medium border", roleBadge.color)}>
                {roleBadge.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className={cn(
                "pl-9 pr-9 bg-white/[0.02] border-white/10 text-white h-10 placeholder:text-muted-foreground/40 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/10",
                errors.password && "border-destructive/50 focus-visible:border-destructive"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2 pt-1">
          <Controller
            name="rememberMe"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="rememberMe"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="border-white/20 data-checked:bg-blue-600 data-checked:border-blue-600"
              />
            )}
          />
          <label
            htmlFor="rememberMe"
            className="text-xs font-medium text-muted-foreground hover:text-white cursor-pointer select-none"
          >
            Remember me
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Spinner className="size-4 text-white animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In to EduMind</span>
          )}
        </Button>
      </form>
    </div>
  );
}
