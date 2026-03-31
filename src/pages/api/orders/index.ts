import type { NextApiRequest, NextApiResponse } from "next";
import { saveOrder, getOrdersForDate, initializeSheets, verifyPassword, getConfig } from "@/lib/sheets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    try {
      const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
      const hash = await getConfig("ADMIN_PASSWORD_HASH");
      if (!hash || !(await verifyPassword(password, hash))) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const date = req.query.date as string;
      if (!date) return res.status(400).json({ error: "date is required" });

      const orders = await getOrdersForDate(date);
      return res.status(200).json({ orders });
    } catch (err) {
      console.error("GET /api/orders:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { customerName, contactNumber, orderDate, items } = req.body;

      if (!customerName || !contactNumber || !orderDate || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      for (const item of items) {
        if (!item.productName || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: "Invalid item data" });
        }
      }

      await initializeSheets();

      const orderId = await saveOrder({
        customerName,
        contactNumber,
        orderDate,
        submittedAt: new Date().toISOString(),
        items,
      });

      return res.status(201).json({ success: true, orderId });
    } catch (err) {
      console.error("POST /api/orders:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
