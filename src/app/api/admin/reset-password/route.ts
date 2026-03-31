import { NextRequest, NextResponse } from "next/server";
import { getConfig, setConfig, verifyPassword, hashPassword } from "@/lib/sheets";

// POST /api/admin/reset-password  (admin only — must provide current password)
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const currentFromHeader = Buffer.from(
      auth.replace("Bearer ", ""),
      "base64"
    ).toString();

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
    }

    // Verify current password (from either body or header)
    const validFromBody = await verifyPassword(currentPassword, hash);
    const validFromHeader = await verifyPassword(currentFromHeader, hash);

    if (!validFromBody || !validFromHeader) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await setConfig("ADMIN_PASSWORD_HASH", newHash);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/reset-password error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
