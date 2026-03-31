import { google } from "googleapis";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  nameHi: string;
  category: "vegetable" | "fruit";
  unit: string;
  active: boolean;
  displayOrder: number;
}

export interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
}

export interface Order {
  orderId: string;
  customerName: string;
  outletName: string;
  contactNumber: string;
  orderDate: string;
  submittedAt: string;
  items: OrderItem[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");

  const credentials =
    typeof keyJson === "string" ? JSON.parse(keyJson) : keyJson;

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

// ─── Sheet Initialisation ─────────────────────────────────────────────────────

export async function initializeSheets(): Promise<void> {
  const sheets = getSheetsClient();

  // Get existing sheet names
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = (meta.data.sheets || []).map(
    (s) => s.properties?.title
  );

  const needed = ["Orders", "OrderItems", "Products", "Config"];
  const toCreate = needed.filter((n) => !existingSheets.includes(n));

  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: toCreate.map((title) => ({
          addSheet: { properties: { title } },
        })),
      },
    });
  }

  // Add headers if sheets are new
  const ordersHeader = [
    ["OrderID", "CustomerName", "OutletName", "ContactNumber", "OrderDate", "SubmittedAt"],
  ];
  const itemsHeader = [["OrderID", "ProductName", "Quantity", "Unit"]];
  const productsHeader = [
    [
      "ProductID",
      "Name",
      "NameHi",
      "Category",
      "Unit",
      "Active",
      "DisplayOrder",
    ],
  ];
  const configHeader = [["Key", "Value"]];

  const setHeaderIfEmpty = async (sheet: string, header: string[][]) => {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheet}!A1:Z1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: header },
      });
    }
  };

  await Promise.all([
    setHeaderIfEmpty("Orders", ordersHeader),
    setHeaderIfEmpty("OrderItems", itemsHeader),
    setHeaderIfEmpty("Products", productsHeader),
    setHeaderIfEmpty("Config", configHeader),
  ]);

  // Seed default products if Products sheet is empty
  const prodRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A2:G",
  });
  if (!prodRes.data.values || prodRes.data.values.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Products!A2",
      valueInputOption: "RAW",
      requestBody: { values: DEFAULT_PRODUCTS },
    });
  }

  // Seed default admin password if Config is empty
  const cfgRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Config!A2:B",
  });
  if (!cfgRes.data.values || cfgRes.data.values.length === 0) {
    const defaultPwd = process.env.ADMIN_PASSWORD;
    if (!defaultPwd) throw new Error("ADMIN_PASSWORD env var is not set");
    const hash = await hashPassword(defaultPwd);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Config!A2",
      valueInputOption: "RAW",
      requestBody: { values: [["ADMIN_PASSWORD_HASH", hash]] },
    });
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A2:G",
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      name: r[1],
      nameHi: r[2] || r[1],
      category: (r[3] || "vegetable") as "vegetable" | "fruit",
      unit: r[4],
      active: r[5] === "TRUE" || r[5] === true || r[5] === "true",
      displayOrder: parseInt(r[6] || "0"),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function addProduct(
  product: Omit<Product, "id">
): Promise<Product> {
  const sheets = getSheetsClient();
  const id = `P${Date.now()}`;
  const row = [
    id,
    product.name,
    product.nameHi,
    product.category,
    product.unit,
    product.active ? "TRUE" : "FALSE",
    product.displayOrder,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A2",
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return { id, ...product };
}

export async function updateProduct(product: Product): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A2:G",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === product.id);
  if (rowIndex === -1) throw new Error("Product not found");

  const sheetRow = rowIndex + 2; // +2 because 1-indexed + header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Products!A${sheetRow}:G${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          product.id,
          product.name,
          product.nameHi,
          product.category,
          product.unit,
          product.active ? "TRUE" : "FALSE",
          product.displayOrder,
        ],
      ],
    },
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function saveOrder(order: Omit<Order, "orderId">): Promise<string> {
  const sheets = getSheetsClient();
  const orderId = `ORD${Date.now()}`;
  const now = new Date().toISOString();

  // Save to Orders sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Orders!A2",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          orderId,
          order.customerName,
          order.outletName || "",
          order.contactNumber,
          order.orderDate,
          now,
        ],
      ],
    },
  });

  // Save items to OrderItems sheet
  const itemRows = order.items.map((item) => [
    orderId,
    item.productName,
    item.quantity,
    item.unit,
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "OrderItems!A2",
    valueInputOption: "RAW",
    requestBody: { values: itemRows },
  });

  return orderId;
}

export async function getOrdersForDate(date: string): Promise<Order[]> {
  const sheets = getSheetsClient();

  const [ordersRes, itemsRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Orders!A2:F",   // A=OrderID B=CustomerName C=OutletName D=Contact E=OrderDate F=SubmittedAt
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "OrderItems!A2:D",
    }),
  ]);

  const orderRows = (ordersRes.data.values || []).filter(
    (r) => r[4] === date    // OrderDate is now column E (index 4)
  );
  const itemRows = itemsRes.data.values || [];

  return orderRows.map((r) => ({
    orderId: r[0],
    customerName: r[1],
    outletName: r[2] || "",
    contactNumber: r[3],
    orderDate: r[4],
    submittedAt: r[5],
    items: itemRows
      .filter((item) => item[0] === r[0])
      .map((item) => ({
        productName: item[1],
        quantity: parseFloat(item[2]),
        unit: item[3],
      })),
  }));
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Config!A2:B",
  });
  const rows = res.data.values || [];
  const row = rows.find((r) => r[0] === key);
  return row ? row[1] : null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Config!A2:B",
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === key);

  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Config!A2",
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  } else {
    const sheetRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Config!A${sheetRow}:B${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[key, value]] },
    });
  }
}

// ─── Password Helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// ─── Default Products ─────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS: string[][] = [
  // ID, Name, NameHi, Category, Unit, Active, DisplayOrder
  // Vegetables
  ["P001", "Tomato", "टमाटर", "vegetable", "kg", "TRUE", "1"],
  ["P002", "Potato", "आलू", "vegetable", "kg", "TRUE", "2"],
  ["P003", "Onion", "प्याज", "vegetable", "kg", "TRUE", "3"],
  ["P004", "Carrot", "गाजर", "vegetable", "kg", "TRUE", "4"],
  ["P005", "Spinach", "पालक", "vegetable", "bunch", "TRUE", "5"],
  ["P006", "Green Peas", "हरी मटर", "vegetable", "kg", "TRUE", "6"],
  ["P007", "Cauliflower", "फूलगोभी", "vegetable", "pcs", "TRUE", "7"],
  ["P008", "Cabbage", "पत्तागोभी", "vegetable", "pcs", "TRUE", "8"],
  ["P009", "Brinjal", "बैंगन", "vegetable", "kg", "TRUE", "9"],
  ["P010", "Lady Finger (Okra)", "भिंडी", "vegetable", "kg", "TRUE", "10"],
  ["P011", "Bitter Gourd", "करेला", "vegetable", "kg", "TRUE", "11"],
  ["P012", "Bottle Gourd", "लौकी", "vegetable", "pcs", "TRUE", "12"],
  ["P013", "Green Chilli", "हरी मिर्च", "vegetable", "kg", "TRUE", "13"],
  ["P014", "Coriander", "धनिया", "vegetable", "bunch", "TRUE", "14"],
  ["P015", "Drumstick", "सहजन", "vegetable", "pcs", "TRUE", "15"],
  ["P016", "Ginger", "अदरक", "vegetable", "kg", "TRUE", "16"],
  ["P017", "Garlic", "लहसुन", "vegetable", "kg", "TRUE", "17"],
  ["P018", "Cucumber", "खीरा", "vegetable", "kg", "TRUE", "18"],
  // Fruits
  ["P019", "Banana", "केला", "fruit", "dozen", "TRUE", "19"],
  ["P020", "Coconut", "नारियल", "fruit", "pcs", "TRUE", "20"],
  ["P021", "Grapes", "अंगूर", "fruit", "boxes", "TRUE", "21"],
  ["P022", "Mango", "आम", "fruit", "dozen", "TRUE", "22"],
  ["P023", "Apple", "सेब", "fruit", "kg", "TRUE", "23"],
  ["P024", "Orange", "संतरा", "fruit", "dozen", "TRUE", "24"],
  ["P025", "Pomegranate", "अनार", "fruit", "pcs", "TRUE", "25"],
  ["P026", "Watermelon", "तरबूज", "fruit", "pcs", "TRUE", "26"],
  ["P027", "Papaya", "पपीता", "fruit", "pcs", "TRUE", "27"],
  ["P028", "Pineapple", "अनानास", "fruit", "pcs", "TRUE", "28"],
  ["P029", "Guava", "अमरूद", "fruit", "kg", "TRUE", "29"],
  ["P030", "Lemon", "नींबू", "fruit", "dozen", "TRUE", "30"],
];
