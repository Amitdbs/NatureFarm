import { NextRequest, NextResponse } from "next/server";
import { saveOrder, getOrdersForDate, initializeSheets, verifyPassword, getConfig } from "@/lib/sheets";

// GET /api/orders?date=YYYY-MM-DD  (admin only)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash || !(await verifyPassword(password, hash))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = req.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

    const orders = await getOrdersForDate(date);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/orders  (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, contactNumber, orderDate, items } = body;

    if (!customerName || !contactNumber || !orderDate || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.productName || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
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

    return NextResponse.json({ success: true, orderId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
