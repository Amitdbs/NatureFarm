import type { NextApiRequest, NextApiResponse } from "next";
import { sendOrderSummary } from "@/lib/telegram";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const cronSecret = req.headers.authorization;
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
  if (cronSecret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Convert current UTC time to IST (UTC+5:30) to get the correct date
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const date = istDate.toISOString().split("T")[0];

    const result = await sendOrderSummary(date);
    console.log(`[CRON] Summary sent for ${date}:`, result);

    return res.status(200).json({ success: true, date, ...result });
  } catch (err) {
    console.error("[CRON] Error:", err);
    return res.status(500).json({ error: "Failed to send summary" });
  }
}
