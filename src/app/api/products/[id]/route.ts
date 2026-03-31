import { NextRequest, NextResponse } from "next/server";
import { updateProduct, verifyPassword, getConfig } from "@/lib/sheets";

// PUT /api/products/:id  (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await updateProduct({
      id: params.id,
      name,
      nameHi: nameHi || name,
      category,
      unit,
      active: active !== false,
      displayOrder: displayOrder || 0,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/products/:id error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
