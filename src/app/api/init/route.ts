import { NextResponse } from "next/server";
import { initializeSheets } from "@/lib/sheets";

// GET /api/init — one-time initialization (call this after first deploy)
export async function GET() {
  try {
    await initializeSheets();
    return NextResponse.json({ success: true, message: "Sheets initialized" });
  } catch (err) {
    console.error("GET /api/init error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
