import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig, verifyPassword, hashPassword } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const currentFromHeader = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters" });
    }

    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash) return res.status(500).json({ error: "Admin not configured" });

    const validFromBody = await verifyPassword(currentPassword, hash);
    const validFromHeader = await verifyPassword(currentFromHeader, hash);

    if (!validFromBody || !validFromHeader) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHash = await hashPassword(newPassword);
    await setConfig("ADMIN_PASSWORD_HASH", newHash);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/reset-password:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
