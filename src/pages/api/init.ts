import type { NextApiRequest, NextApiResponse } from "next";
import { initializeSheets } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await initializeSheets();
    return res.status(200).json({ success: true, message: "Sheets initialized successfully" });
  } catch (err) {
    console.error("GET /api/init:", err);
    return res.status(500).json({ error: String(err) });
  }
}
