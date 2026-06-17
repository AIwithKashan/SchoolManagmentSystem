import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  let dbStatus = "connected";
  let status = "healthy";
  
  try {
    // Attempt a light check query to check live database connectivity
    await db.school.findFirst();
    
    // Check if the connection failed and the fallback to in-memory mock was triggered
    const isMock = (globalThis as any).useMock === true;
    if (isMock) {
      dbStatus = "fallback_mock";
      status = "degraded";
    }
  } catch (error) {
    dbStatus = "disconnected";
    status = "unhealthy";
  }

  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };

  const missingEnvCount = Object.values(envCheck).filter((val) => !val).length;
  if (missingEnvCount > 0 && status === "healthy") {
    status = "degraded";
  }

  return NextResponse.json(
    {
      status,
      database: dbStatus,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environmentVariables: envCheck,
    },
    {
      status: status === "unhealthy" ? 503 : 200,
    }
  );
}
