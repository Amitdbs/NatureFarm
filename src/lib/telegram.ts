import { getOrdersForDate, Order } from "./sheets";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// ─── Core send ────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Display name shown in messages: "Outlet Name (Customer Name)" or just "Customer Name" */
function displayName(order: Order): string {
  if (order.outletName && order.outletName.trim()) {
    return `${order.outletName.trim()} <i>(${order.customerName})</i>`;
  }
  return order.customerName;
}

// ─── Build and send summary ───────────────────────────────────────────────────

export async function sendOrderSummary(date: string): Promise<{
  success: boolean;
  orderCount: number;
  message: string;
}> {
  const orders = await getOrdersForDate(date);

  if (orders.length === 0) {
    await sendTelegramMessage(
      `🌿 <b>NatureFarm</b> — No orders found for <b>${formatDate(date)}</b>.`
    );
    return { success: true, orderCount: 0, message: "No orders found" };
  }

  // ── Message 1: Full delivery list per outlet ──────────────────────────────
  const msg1: string[] = [
    `🛵 <b>NatureFarm — Delivery List</b>`,
    `📅 Date: <b>${formatDate(date)}</b>   |   📦 Total Orders: <b>${orders.length}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    "",
  ];

  orders.forEach((order, idx) => {
    const outlet = order.outletName?.trim() ? `🏪 <b>${order.outletName.trim()}</b>` : `👤 <b>${order.customerName}</b>`;
    msg1.push(`${idx + 1}. ${outlet}`);
    msg1.push(`   👤 ${order.customerName}   📞 ${order.contactNumber}`);
    order.items.forEach((item) => {
      msg1.push(`   • ${item.productName}: <b>${item.quantity} ${item.unit}</b>`);
    });
    msg1.push("");
  });

  await sendTelegramMessage(msg1.join("\n"));

  // ── Message 2: Packing summary for distributor ────────────────────────────
  // product → [ { outletName/customerName, qty } ]
  const productMap = new Map<string, { unit: string; entries: { label: string; qty: number }[] }>();

  orders.forEach((order) => {
    const label = order.outletName?.trim() || order.customerName;
    order.items.forEach((item) => {
      if (!productMap.has(item.productName)) {
        productMap.set(item.productName, { unit: item.unit, entries: [] });
      }
      productMap.get(item.productName)!.entries.push({ label, qty: item.quantity });
    });
  });

  const msg2: string[] = [
    `📦 <b>NatureFarm — Packing Summary</b>`,
    `📅 Date: <b>${formatDate(date)}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `<b>🔢 QUANTITIES (for packing):</b>`,
  ];

  productMap.forEach((data, productName) => {
    const qtys = data.entries.map((e) => e.qty).join(", ");
    const total = data.entries.reduce((s, e) => s + e.qty, 0);
    msg2.push(`• <b>${productName}</b>: ${qtys} = <u>Total: ${total} ${data.unit}</u>`);
  });

  // msg2.push("");
  // msg2.push(`<b>🏪 OUTLET-WISE BREAKDOWN (for delivery):</b>`);

  // productMap.forEach((data, productName) => {
  //   const outletList = data.entries.map((e) => `${e.label}→${e.qty}`).join(", ");
  //   msg2.push(`• <b>${productName}</b>: ${outletList} ${data.unit}`);
  // });

  await sendTelegramMessage(msg2.join("\n"));

  return {
    success: true,
    orderCount: orders.length,
    message: `Summary sent for ${orders.length} orders`,
  };
}
