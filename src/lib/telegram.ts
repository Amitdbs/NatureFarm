import { getOrdersForDate, Order } from "./sheets";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// ─── Core Send ────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Build & send order summary ───────────────────────────────────────────────

export async function sendOrderSummary(date: string): Promise<{
  success: boolean;
  orderCount: number;
  message: string;
}> {
  const orders = await getOrdersForDate(date);

  if (orders.length === 0) {
    await sendTelegramMessage(
      `🌿 <b>NatureFarm</b> — No orders found for <b>${formatDisplayDate(date)}</b>.`
    );
    return { success: true, orderCount: 0, message: "No orders found" };
  }

  // ── Message 1: Detailed order list (for delivery) ─────────────────────────
  const msg1Lines: string[] = [
    `🛵 <b>NatureFarm — Delivery List</b>`,
    `📅 Date: <b>${formatDisplayDate(date)}</b>`,
    `📦 Total Orders: <b>${orders.length}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    "",
  ];

  orders.forEach((order, idx) => {
    msg1Lines.push(
      `<b>${idx + 1}. ${order.customerName}</b> | 📞 ${order.contactNumber}`
    );
    order.items.forEach((item) => {
      msg1Lines.push(`   • ${item.productName}: <b>${item.quantity} ${item.unit}</b>`);
    });
    msg1Lines.push("");
  });

  await sendTelegramMessage(msg1Lines.join("\n"));

  // ── Message 2: Packing summary (for distributor) ──────────────────────────
  // Aggregate items across all orders
  const productMap = new Map<
    string,
    { unit: string; entries: { customer: string; qty: number }[] }
  >();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productName;
      if (!productMap.has(key)) {
        productMap.set(key, { unit: item.unit, entries: [] });
      }
      productMap.get(key)!.entries.push({
        customer: order.customerName,
        qty: item.quantity,
      });
    });
  });

  const msg2Lines: string[] = [
    `📦 <b>NatureFarm — Packing Summary</b>`,
    `📅 Date: <b>${formatDisplayDate(date)}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `<b>🔢 QUANTITY LIST (for packing):</b>`,
  ];

  productMap.forEach((data, productName) => {
    const quantities = data.entries.map((e) => e.qty).join(", ");
    const total = data.entries.reduce((s, e) => s + e.qty, 0);
    msg2Lines.push(
      `• <b>${productName}</b>: ${quantities} = <b>Total: ${total} ${data.unit}</b>`
    );
  });

  msg2Lines.push("");
  msg2Lines.push(`<b>🏪 OUTLET-WISE BREAKDOWN (for delivery sorting):</b>`);

  productMap.forEach((data, productName) => {
    const outletList = data.entries
      .map((e) => `${e.customer}→${e.qty}`)
      .join(", ");
    msg2Lines.push(`• <b>${productName}</b>: ${outletList} ${data.unit}`);
  });

  await sendTelegramMessage(msg2Lines.join("\n"));

  return {
    success: true,
    orderCount: orders.length,
    message: `Summary sent for ${orders.length} orders`,
  };
}
