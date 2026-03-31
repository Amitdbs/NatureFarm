import type { NextApiRequest, NextApiResponse } from "next";
import { updateProduct, verifyPassword, getConfig } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  try {
    const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash || !(await verifyPassword(password, hash))) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = req.query.id as string;
    const { name, nameHi, category, unit, active, displayOrder } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await updateProduct({
      id,
      name,
      nameHi: nameHi || name,
      category,
      unit,
      active: active !== false,
      displayOrder: displayOrder || 0,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("PUT /api/products/[id]:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
