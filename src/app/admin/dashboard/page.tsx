"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface Product {
  id: string;
  name: string;
  nameHi: string;
  category: "vegetable" | "fruit";
  unit: string;
  active: boolean;
  displayOrder: number;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
}

interface Order {
  orderId: string;
  customerName: string;
  contactNumber: string;
  orderDate: string;
  submittedAt: string;
  items: OrderItem[];
}

type Tab = "products" | "orders" | "settings";

const UNITS = [
  "kg", "g", "dozen", "pcs", "bunch", "boxes", "litre", "ml", "packet"
];

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const [adminPwd, setAdminPwd] = useState("");
  const [tab, setTab] = useState<Tab>("products");

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: "",
    nameHi: "",
    category: "vegetable",
    unit: "kg",
    active: true,
    displayOrder: 0,
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Orders state
  const [ordersDate, setOrdersDate] = useState(today());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");

  // Settings state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: "", error: false });

  // Auth check
  useEffect(() => {
    const pwd = sessionStorage.getItem("nf_admin_pwd");
    if (!pwd) {
      router.replace("/admin");
      return;
    }
    setAdminPwd(pwd);
  }, [router]);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${btoa(adminPwd)}`,
    }),
    [adminPwd]
  );

  // Load products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (adminPwd) loadProducts();
  }, [adminPwd, loadProducts]);

  // Load orders for date
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?date=${ordersDate}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoadingOrders(false);
    }
  }, [ordersDate, authHeaders]);

  useEffect(() => {
    if (adminPwd && tab === "orders") loadOrders();
  }, [adminPwd, tab, ordersDate, loadOrders]);

  function logout() {
    sessionStorage.removeItem("nf_admin_pwd");
    router.push("/");
  }

  // ── Product Actions ────────────────────────────────────────────────────────

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({
      name: "",
      nameHi: "",
      category: "vegetable",
      unit: "kg",
      active: true,
      displayOrder: products.length + 1,
    });
    setProductError("");
    setShowProductForm(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({ ...product });
    setProductError("");
    setShowProductForm(true);
  }

  async function toggleProductActive(product: Product) {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ...product, active: !product.active }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, active: !p.active } : p
          )
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function saveProduct() {
    if (!productForm.name?.trim()) {
      setProductError(t("required_field"));
      return;
    }

    setProductSaving(true);
    setProductError("");
    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ ...editingProduct, ...productForm }),
        });
        if (!res.ok) throw new Error("Failed");
        await loadProducts();
      } else {
        // Add new
        const res = await fetch("/api/products", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(productForm),
        });
        if (!res.ok) throw new Error("Failed");
        await loadProducts();
      }
      setShowProductForm(false);
    } catch {
      setProductError(t("error_generic"));
    } finally {
      setProductSaving(false);
    }
  }

  // ── Telegram Summary ───────────────────────────────────────────────────────

  async function sendSummary() {
    setSendingTelegram(true);
    setTelegramMsg("");
    try {
      const res = await fetch("/api/admin/send-summary", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date: ordersDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramMsg(
          data.orderCount === 0
            ? "No orders found — empty summary sent."
            : `${t("summary_sent")} (${data.orderCount} orders)`
        );
      } else {
        setTelegramMsg(data.error || t("error_generic"));
      }
    } catch {
      setTelegramMsg(t("error_generic"));
    } finally {
      setSendingTelegram(false);
    }
  }

  // ── Change Password ────────────────────────────────────────────────────────

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ text: t("required_field"), error: true });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ text: t("password_mismatch"), error: true });
      return;
    }
    if (newPwd.length < 4) {
      setPwdMsg({ text: "Password must be at least 4 characters.", error: true });
      return;
    }

    setPwdSaving(true);
    setPwdMsg({ text: "", error: false });
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("nf_admin_pwd", newPwd);
        setAdminPwd(newPwd);
        setPwdMsg({ text: t("password_updated"), error: false });
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        setPwdMsg({ text: data.error || t("password_wrong"), error: true });
      }
    } catch {
      setPwdMsg({ text: t("error_generic"), error: true });
    } finally {
      setPwdSaving(false);
    }
  }

  if (!adminPwd) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl animate-spin mb-2">🌀</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-green-50 pb-8">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <div>
            <h1 className="font-bold text-base leading-tight">{t("app_name")}</h1>
            <p className="text-green-200 text-xs">{t("dashboard_title")}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-green-200 hover:text-white text-sm font-medium flex items-center gap-1"
        >
          <span>🚪</span> {t("logout")}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex max-w-lg mx-auto">
          {(["products", "orders", "settings"] as Tab[]).map((t_tab) => (
            <button
              key={t_tab}
              onClick={() => setTab(t_tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all duration-150 ${
                tab === t_tab
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t_tab === "products"
                ? "📦 " + t("products_tab")
                : t_tab === "orders"
                ? "📋 " + t("orders_tab")
                : "⚙️ " + t("settings_tab")}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* ── PRODUCTS TAB ──────────────────────────────────────────────────── */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0">{t("products_tab")}</h2>
              <button
                onClick={openAddProduct}
                className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700 active:scale-95 transition-all"
              >
                + {t("add_product")}
              </button>
            </div>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 sm:items-center">
                <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-800">
                      {editingProduct ? t("edit_product") : t("add_product")}
                    </h3>
                    <button
                      onClick={() => setShowProductForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("product_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={productForm.name || ""}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      placeholder="e.g. Tomato"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("product_name_hi")}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={productForm.nameHi || ""}
                      onChange={(e) =>
                        setProductForm({ ...productForm, nameHi: e.target.value })
                      }
                      placeholder="e.g. टमाटर"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("category")}
                      </label>
                      <select
                        className="input-field"
                        value={productForm.category}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            category: e.target.value as "vegetable" | "fruit",
                          })
                        }
                      >
                        <option value="vegetable">🥦 {t("vegetable")}</option>
                        <option value="fruit">🍎 {t("fruit")}</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("unit")}
                      </label>
                      <select
                        className="input-field"
                        value={productForm.unit}
                        onChange={(e) =>
                          setProductForm({ ...productForm, unit: e.target.value })
                        }
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("display_order")}
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={productForm.displayOrder || 0}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            displayOrder: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm({
                            ...productForm,
                            active: !productForm.active,
                          })
                        }
                        className={`flex-1 rounded-xl font-medium text-sm border-2 transition-all ${
                          productForm.active
                            ? "bg-green-50 border-green-400 text-green-700"
                            : "bg-gray-50 border-gray-300 text-gray-500"
                        }`}
                      >
                        {productForm.active ? "✅ " + t("active") : "⭕ " + t("inactive")}
                      </button>
                    </div>
                  </div>

                  {productError && (
                    <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                      {productError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowProductForm(false)}
                      className="btn-secondary py-2.5"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={saveProduct}
                      disabled={productSaving}
                      className="btn-primary py-2.5"
                    >
                      {productSaving ? t("saving") : t("save")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products List */}
            {loadingProducts ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl animate-spin mb-2">🌀</div>
                <p>Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p>{t("no_products")}</p>
              </div>
            ) : (
              <>
                {/* Vegetables */}
                {["vegetable", "fruit"].map((cat) => {
                  const catProducts = products.filter(
                    (p) => p.category === cat
                  );
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>{cat === "vegetable" ? "🥦" : "🍎"}</span>
                        {cat === "vegetable" ? t("vegetables") : t("fruits")}
                        <span className="text-gray-300 font-normal normal-case tracking-normal">
                          ({catProducts.length})
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {catProducts.map((product) => (
                          <div
                            key={product.id}
                            className={`card flex items-center gap-3 py-3 ${
                              !product.active ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">
                                {locale === "hi" && product.nameHi
                                  ? product.nameHi
                                  : product.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.unit} ·{" "}
                                {product.active ? (
                                  <span className="text-green-600 font-medium">
                                    {t("active")}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">
                                    {t("inactive")}
                                  </span>
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() => openEditProduct(product)}
                              className="text-blue-500 hover:text-blue-700 text-sm font-medium px-2 py-1"
                            >
                              ✏️
                            </button>

                            <button
                              onClick={() => toggleProductActive(product)}
                              disabled={togglingId === product.id}
                              className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${
                                product.active
                                  ? "border-red-200 text-red-500 hover:bg-red-50"
                                  : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}
                            >
                              {togglingId === product.id
                                ? "..."
                                : product.active
                                ? t("inactive")
                                : t("active")}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── ORDERS TAB ────────────────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {t("orders_for")}:
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={ordersDate}
                    onChange={(e) => setOrdersDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={loadOrders}
                  className="bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-green-700 active:scale-95 transition-all mt-5"
                >
                  🔄
                </button>
              </div>

              {/* Send Telegram */}
              <button
                onClick={sendSummary}
                disabled={sendingTelegram}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
              >
                {sendingTelegram ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <span>📨</span>
                    {t("send_summary")}
                  </>
                )}
              </button>

              {telegramMsg && (
                <p
                  className={`text-sm text-center px-3 py-2 rounded-lg ${
                    telegramMsg.includes("sent") || telegramMsg.includes("भेजा")
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {telegramMsg}
                </p>
              )}
            </div>

            {/* Orders List */}
            {loadingOrders ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl animate-spin mb-2">🌀</div>
                <p>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p>{t("no_orders")}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="section-title mb-0">
                    {t("total_orders")}: <span className="text-green-700">{orders.length}</span>
                  </h2>
                </div>

                <div className="space-y-3">
                  {orders.map((order, idx) => (
                    <div key={order.orderId} className="card">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800">
                            {idx + 1}. {order.customerName}
                          </p>
                          <p className="text-sm text-gray-500">
                            📞 {order.contactNumber}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          #{order.orderId.slice(-6)}
                        </span>
                      </div>
                      <div className="border-t border-gray-100 pt-2 space-y-1">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700">{item.productName}</span>
                            <span className="font-semibold text-green-700">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <h2 className="section-title">🔑 {t("change_password")}</h2>

              <form onSubmit={changePassword} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("current_password")}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={currentPwd}
                    onChange={(e) => {
                      setCurrentPwd(e.target.value);
                      setPwdMsg({ text: "", error: false });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("new_password")}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPwd}
                    onChange={(e) => {
                      setNewPwd(e.target.value);
                      setPwdMsg({ text: "", error: false });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("confirm_password")}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={confirmPwd}
                    onChange={(e) => {
                      setConfirmPwd(e.target.value);
                      setPwdMsg({ text: "", error: false });
                    }}
                  />
                </div>

                {pwdMsg.text && (
                  <p
                    className={`text-sm px-3 py-2 rounded-lg ${
                      pwdMsg.error
                        ? "bg-red-50 text-red-600"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {pwdMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="btn-primary"
                >
                  {pwdSaving ? t("saving") : t("update_password")}
                </button>
              </form>
            </div>

            {/* App Info */}
            <div className="card bg-green-50 border-green-100">
              <h2 className="section-title text-green-800">ℹ️ App Info</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>App</span>
                  <span className="font-medium text-green-700">NatureFarm v1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-summary</span>
                  <span className="font-medium text-green-700">Daily 5:00 AM IST</span>
                </div>
                <div className="flex justify-between">
                  <span>Telegram</span>
                  <span className="font-medium text-green-700">Connected ✅</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
