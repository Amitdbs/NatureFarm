import { NextRequest, NextResponse } from "next/server";
import { getProducts, addProduct, initializeSheets, verifyPassword, getConfig } from "@/lib/sheets";

// GET /api/products  (public — returns active products for order form)
export async function GET() {
  try {
    await initializeSheets();
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/products  (admin only)
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const password = Buffer.from(auth.replace("Bearer ", ""), "base64").toString();
    const hash = await getConfig("ADMIN_PASSWORD_HASH");
    if (!hash || !(await verifyPassword(password, hash))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, nameHi, category, unit, active, displayOrder } = body;

    if (!name || !category || !unit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const product = await addProduct({
      name,
      nameHi: nameHi || name,
      category,
      unit,
      active: active !== false,
      displayOrder: displayOrder || 0,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
