import { NextRequest, NextResponse } from "next/server";
import { sendOrderSummary } from "@/lib/telegram";

// GET /api/cron  — called by Vercel Cron at 23:30 UTC = 05:00 AM IST
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = req.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Send summary for today (IST date)
    // When cron fires at 23:30 UTC = 05:00 IST next day
    // So we use the IST "today" which is UTC+5:30
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in ms
    const istDate = new Date(now.getTime() + istOffset);
    const date = istDate.toISOString().split("T")[0];

    const result = await sendOrderSummary(date);
    console.log(`[CRON] Summary sent for ${date}:`, result);

    return NextResponse.json({ success: true, date, ...result });
  } catch (err) {
    console.error("[CRON] Error sending summary:", err);
    return NextResponse.json({ error: "Failed to send summary" }, { status: 500 });
  }
}
