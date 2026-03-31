import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, verifyPassword } from "@/lib/sheets";
import { sendOrderSummary } from "@/lib/telegram";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash || !(await verifyPassword(password, hash))) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });

    const result = await sendOrderSummary(date);
    return res.status(200).json(result);
  } catch (err) {
    console.error("POST /api/admin/send-summary:", err);
    return res.status(500).json({ error: "Failed to send summary" });
  }
}
