import type { NextApiRequest, NextApiResponse } from "next";
import { getProducts, addProduct, initializeSheets, verifyPassword, getConfig } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      await initializeSheets();
      const products = await getProducts();
      return res.status(200).json({ products });
    } catch (err) {
      console.error("GET /api/products:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    try {
      const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
      const hash = await getConfig("ADMIN_PASSWORD_HASH");
      if (!hash || !(await verifyPassword(password, hash))) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { name, nameHi, category, unit, active, displayOrder } = req.body;
      if (!name || !category || !unit) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const product = await addProduct({
        name,
        nameHi: nameHi || name,
        category,
        unit,
        active: active !== false,
        displayOrder: displayOrder || 0,
      });
      return res.status(201).json({ success: true, product });
    } catch (err) {
      console.error("POST /api/products:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
