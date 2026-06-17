import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { limitAI, limitAPI } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. IP API rate limit
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "127.0.0.1";
    const apiCheck = limitAPI(ip);
    if (!apiCheck.success) {
      return new NextResponse(
        JSON.stringify({ error: apiCheck.message }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. AI endpoints rate limit
  if (pathname.startsWith("/api/ai")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token && token.id) {
      const aiCheck = limitAI(token.id as string);
      if (!aiCheck.success) {
        return new NextResponse(
          JSON.stringify({ error: aiCheck.message }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Helper function for role redirection
  const getDashboardByRole = (role: string) => {
    switch (role) {
      case "PRINCIPAL":
        return "/principal/dashboard";
      case "TEACHER":
        return "/teacher/dashboard";
      case "PARENT":
        return "/parent/dashboard";
      case "SUPER_ADMIN":
        return "/admin/dashboard";
      default:
        return "/";
    }
  };

  // Identify public routes
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth");

  // Case 1: User is NOT logged in
  if (!token) {
    if (!isPublicRoute) {
      // Trying to access protected route -> redirect to /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Accessing public route, let it pass
    return NextResponse.next();
  }

  // Case 2: User IS logged in
  const userRole = token.role as string;
  const correctDashboard = getDashboardByRole(userRole);

  // If logged-in user tries to access the /login page, redirect them to their dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  // Role-based route checks
  const isPrincipalRoute = pathname.startsWith("/principal");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isParentRoute = pathname.startsWith("/parent");
  const isAdminRoute = pathname.startsWith("/admin");

  if (isPrincipalRoute && userRole !== "PRINCIPAL") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (isTeacherRoute && userRole !== "TEACHER") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (isParentRoute && userRole !== "PARENT") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  if (isAdminRoute && userRole !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(correctDashboard, request.url));
  }

  return NextResponse.next();
}

// Exclude static paths, image optimization paths, favicon, and public assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
