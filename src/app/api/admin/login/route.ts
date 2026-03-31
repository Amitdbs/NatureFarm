import { NextRequest, NextResponse } from "next/server";
import { initializeSheets, getConfig, verifyPassword } from "@/lib/sheets";

// POST /api/admin/login
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    await initializeSheets();

    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
    }

    const valid = await verifyPassword(password, hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
