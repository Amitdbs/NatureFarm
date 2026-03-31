import type { NextApiRequest, NextApiResponse } from "next";
import { initializeSheets, getConfig, verifyPassword } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    await initializeSheets();

    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash) return res.status(500).json({ error: "Admin not configured" });

    const valid = await verifyPassword(password, hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/login:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
