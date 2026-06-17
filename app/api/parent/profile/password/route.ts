import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const userId = session.user.id;
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return errorResponse("Missing required fields", 400);
    }

    if (newPassword !== confirmPassword) {
      return errorResponse("New passwords do not match", 400);
    }

    // Retrieve active User profile including current password hash
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return errorResponse("Record not found", 404);
    }

    // Verify existing password
    const isMatch = await compare(currentPassword, user.password);
    if (!isMatch) {
      return errorResponse("Incorrect current password", 400);
    }

    // Hash and store new password
    const hashedPassword = await hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_PASSWORD_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
