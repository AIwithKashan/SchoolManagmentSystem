import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

// Helper to resolve settings file path
function getSettingsFilePath(userId: string) {
  return path.join(process.cwd(), "data", "settings", `parent-${userId}.json`);
}

// Default settings configuration
const defaultSettings = {
  notifications: {
    attendance: true,
    assignment: true,
    grade: true,
    fee: true,
    announcement: true,
    emergency: true, // locked ON
  },
  channels: {
    inApp: true, // locked ON
    whatsapp: false,
    whatsappNumber: "",
    email: false,
    emailAddress: "",
    sms: false,
  },
  language: "en",
  privacy: {
    schoolSeeContact: true,
    newsletter: false,
  },
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const userId = session.user.id;
    const filePath = getSettingsFilePath(userId);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const settings = JSON.parse(data);
      // Ensure emergency alert and in-app channels remain locked to true
      settings.notifications.emergency = true;
      settings.channels.inApp = true;
      return NextResponse.json(settings);
    } catch (readError) {
    console.error('[API_ERROR]', readError);
    return errorResponse("Server error. Please try again.", 500);
  }
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_SETTINGS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const userId = session.user.id;
    const payload = await req.json();

    // Enforce locked settings
    if (!payload.notifications) payload.notifications = {};
    payload.notifications.emergency = true;

    if (!payload.channels) payload.channels = {};
    payload.channels.inApp = true;

    const filePath = getSettingsFilePath(userId);
    const dirPath = path.dirname(filePath);

    // Create settings directory recursively if missing
    await fs.mkdir(dirPath, { recursive: true });

    // Write file to disk
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

    return NextResponse.json({ success: true, settings: payload });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_SETTINGS_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
