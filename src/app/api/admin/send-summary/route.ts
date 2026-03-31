import { NextRequest, NextResponse } from "next/server";
import { getConfig, verifyPassword } from "@/lib/sheets";
import { sendOrderSummary } from "@/lib/telegram";

// POST /api/admin/send-summary  (admin only)
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash || !(await verifyPassword(password, hash))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const result = await sendOrderSummary(date);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/admin/send-summary error:", err);
    return NextResponse.json({ error: "Failed to send summary" }, { status: 500 });
  }
}
