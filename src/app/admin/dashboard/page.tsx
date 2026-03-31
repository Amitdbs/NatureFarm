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

interface OrderItem { productName: string; quantity: number; unit: string; }
interface Order {
  orderId: string;
  customerName: string;
  contactNumber: string;
  orderDate: string;
  submittedAt: string;
  items: OrderItem[];
}

type Tab = "products" | "orders" | "settings";
const UNITS = ["kg", "g", "dozen", "pcs", "bunch", "boxes", "litre", "ml", "packet"];

function today() { return new Date().toISOString().split("T")[0]; }

export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const [adminPwd, setAdminPwd] = useState("");
  const [tab, setTab] = useState<Tab>("products");

  /* Products */
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: "", nameHi: "", category: "vegetable", unit: "kg", active: true, displayOrder: 0 });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* Orders */
  const [ordersDate, setOrdersDate] = useState(today());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState({ text: "", ok: true });

  /* Settings */
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: "", error: false });

  useEffect(() => {
    const pwd = sessionStorage.getItem("nf_admin_pwd");
    if (!pwd) { router.replace("/admin"); return; }
    setAdminPwd(pwd);
  }, [router]);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${btoa(adminPwd)}`,
  }), [adminPwd]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => { if (adminPwd) loadProducts(); }, [adminPwd, loadProducts]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?date=${ordersDate}`, { headers: authHeaders() });
      const data = await res.json();
      setOrders(data.orders || []);
    } finally { setLoadingOrders(false); }
  }, [ordersDate, authHeaders]);

  useEffect(() => { if (adminPwd && tab === "orders") loadOrders(); }, [adminPwd, tab, ordersDate, loadOrders]);

  function logout() { sessionStorage.removeItem("nf_admin_pwd"); router.push("/"); }

  /* ── Product helpers ───────────────────────────────────────── */
  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({ name: "", nameHi: "", category: "vegetable", unit: "kg", active: true, displayOrder: products.length + 1 });
    setProductError("");
    setShowProductForm(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setProductForm({ ...p });
    setProductError("");
    setShowProductForm(true);
  }

  async function toggleActive(product: Product) {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ ...product, active: !product.active }),
      });
      if (res.ok) setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p));
    } finally { setTogglingId(null); }
  }

  async function saveProduct() {
    if (!productForm.name?.trim()) { setProductError(t("required_field")); return; }
    setProductSaving(true); setProductError("");
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const body = editingProduct ? { ...editingProduct, ...productForm } : productForm;
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      await loadProducts();
      setShowProductForm(false);
    } catch { setProductError(t("error_generic")); }
    finally { setProductSaving(false); }
  }

  /* ── Telegram ──────────────────────────────────────────────── */
  async function sendSummary() {
    setSendingTelegram(true); setTelegramMsg({ text: "", ok: true });
    try {
      const res = await fetch("/api/admin/send-summary", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ date: ordersDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramMsg({ text: data.orderCount === 0 ? "No orders — empty summary sent." : `${t("summary_sent")} (${data.orderCount} orders)`, ok: true });
      } else {
        setTelegramMsg({ text: data.error || t("error_generic"), ok: false });
      }
    } catch { setTelegramMsg({ text: t("error_generic"), ok: false }); }
    finally { setSendingTelegram(false); }
  }

  /* ── Password ──────────────────────────────────────────────── */
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdMsg({ text: t("required_field"), error: true }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ text: t("password_mismatch"), error: true }); return; }
    if (newPwd.length < 4) { setPwdMsg({ text: "Min 4 characters required.", error: true }); return; }
    setPwdSaving(true); setPwdMsg({ text: "", error: false });
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("nf_admin_pwd", newPwd);
        setAdminPwd(newPwd);
        setPwdMsg({ text: t("password_updated"), error: false });
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        setPwdMsg({ text: data.error || t("password_wrong"), error: true });
      }
    } catch { setPwdMsg({ text: t("error_generic"), error: true }); }
    finally { setPwdSaving(false); }
  }

  if (!adminPwd) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center text-gray-400 animate-pulse"><p className="text-4xl mb-2">🌿</p><p>Loading…</p></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-green-50 pb-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-green-700 text-white sticky top-0 z-20 shadow-md">
        <div className="page-wrapper-wide py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl">🌿</div>
            <div>
              <h1 className="font-bold text-base leading-tight">{t("app_name")}</h1>
              <p className="text-green-200 text-xs">{t("dashboard_title")}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm font-medium text-green-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
            🚪 {t("logout")}
          </button>
        </div>

        {/* Tabs */}
        <div className="page-wrapper-wide">
          <div className="flex border-b border-green-600">
            {(["products", "orders", "settings"] as Tab[]).map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-medium border-b-2 transition-all duration-150 ${
                  tab === tb ? "border-white text-white" : "border-transparent text-green-300 hover:text-white"
                }`}>
                {tb === "products" ? "📦 " + t("products_tab") : tb === "orders" ? "📋 " + t("orders_tab") : "⚙️ " + t("settings_tab")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-wrapper-wide pt-6">

        {/* ── PRODUCTS TAB ──────────────────────────────────── */}
        {tab === "products" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0">{t("products_tab")}</h2>
              <button onClick={openAddProduct}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center gap-1.5">
                + {t("add_product")}
              </button>
            </div>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowProductForm(false)}>
                <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg text-gray-800">{editingProduct ? t("edit_product") : t("add_product")}</h3>
                    <button onClick={() => setShowProductForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">✕</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">{t("product_name")} <span className="text-red-500">*</span></label>
                      <input type="text" className="input-field" value={productForm.name || ""} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Tomato" />
                    </div>
                    <div>
                      <label className="label">{t("product_name_hi")}</label>
                      <input type="text" className="input-field" value={productForm.nameHi || ""} onChange={(e) => setProductForm({ ...productForm, nameHi: e.target.value })} placeholder="e.g. टमाटर" />
                    </div>
                    <div>
                      <label className="label">{t("category")}</label>
                      <select className="input-field" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value as "vegetable" | "fruit" })}>
                        <option value="vegetable">🥦 {t("vegetable")}</option>
                        <option value="fruit">🍎 {t("fruit")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">{t("unit")}</label>
                      <select className="input-field" value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">{t("display_order")}</label>
                      <input type="number" className="input-field" value={productForm.displayOrder || 0} onChange={(e) => setProductForm({ ...productForm, displayOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <button type="button" onClick={() => setProductForm({ ...productForm, active: !productForm.active })}
                        className={`input-field text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          productForm.active ? "bg-green-50 border-green-400 text-green-700" : "bg-gray-50 border-gray-300 text-gray-500"
                        }`}>
                        {productForm.active ? "✅ " + t("active") : "⭕ " + t("inactive")}
                      </button>
                    </div>
                  </div>

                  {productError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{productError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowProductForm(false)} className="btn-secondary py-2.5">{t("cancel")}</button>
                    <button onClick={saveProduct} disabled={productSaving} className="btn-primary py-2.5">
                      {productSaving ? t("saving") : t("save")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products List */}
            {loadingProducts ? (
              <div className="text-center py-12 text-gray-400 animate-pulse"><p className="text-4xl mb-2">🌿</p><p>Loading…</p></div>
            ) : products.length === 0 ? (
              <div className="card-lg text-center py-12 text-gray-400"><p className="text-4xl mb-2">📭</p><p>{t("no_products")}</p></div>
            ) : (
              <>
                {(["vegetable", "fruit"] as const).map((cat) => {
                  const list = products.filter((p) => p.category === cat);
                  if (!list.length) return null;
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        {cat === "vegetable" ? "🥦" : "🍎"} {cat === "vegetable" ? t("vegetables") : t("fruits")}
                        <span className="text-gray-300 normal-case tracking-normal font-normal">({list.length})</span>
                      </h3>
                      {/* Responsive grid: 1 col → 2 col sm → 3 col lg */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {list.map((product) => (
                          <div key={product.id} className={`card flex items-center gap-3 ${!product.active ? "opacity-55" : ""}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate text-sm">
                                {locale === "hi" && product.nameHi ? product.nameHi : product.name}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                <span>{product.unit}</span>
                                <span>·</span>
                                {product.active
                                  ? <span className="text-green-600 font-medium">{t("active")}</span>
                                  : <span className="text-gray-400">{t("inactive")}</span>}
                              </p>
                            </div>
                            <button onClick={() => openEditProduct(product)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 text-base transition-colors flex-shrink-0">✏️</button>
                            <button
                              onClick={() => toggleActive(product)}
                              disabled={togglingId === product.id}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
                                product.active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}>
                              {togglingId === product.id ? "…" : product.active ? t("inactive") : t("active")}
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

        {/* ── ORDERS TAB ────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="space-y-5">
            {/* Controls */}
            <div className="card-lg space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <label className="label">{t("orders_for")}</label>
                  <input
                    type="date"
                    className="input-field"
                    value={ordersDate}
                    onChange={(e) => setOrdersDate(e.target.value)}
                    style={{ colorScheme: "light" }}
                  />
                </div>
                <button onClick={loadOrders} className="btn-icon sm:mb-0 w-full sm:w-auto px-5">
                  🔄 <span className="sm:hidden ml-1">Refresh</span>
                </button>
              </div>

              <button onClick={sendSummary} disabled={sendingTelegram}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                {sendingTelegram ? <><span className="animate-spin inline-block">🌀</span> {t("sending")}</> : <>📨 {t("send_summary")}</>}
              </button>

              {telegramMsg.text && (
                <p className={`text-sm text-center px-3 py-2.5 rounded-xl font-medium ${telegramMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {telegramMsg.text}
                </p>
              )}
            </div>

            {/* Orders list */}
            {loadingOrders ? (
              <div className="text-center py-12 text-gray-400 animate-pulse"><p className="text-4xl mb-2">🌿</p><p>Loading…</p></div>
            ) : orders.length === 0 ? (
              <div className="card-lg text-center py-12 text-gray-400"><p className="text-4xl mb-2">📭</p><p>{t("no_orders")}</p></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-600">
                    {t("total_orders")}: <span className="text-green-700 text-base">{orders.length}</span>
                  </p>
                </div>
                {/* Responsive grid: 1 col → 2 col md → 3 col xl */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {orders.map((order, idx) => (
                    <div key={order.orderId} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-800">{idx + 1}. {order.customerName}</p>
                          <p className="text-sm text-gray-500 mt-0.5">📞 {order.contactNumber}</p>
                        </div>
                        <span className="text-xs text-gray-300 font-mono bg-gray-50 px-2 py-0.5 rounded">#{order.orderId.slice(-6)}</span>
                      </div>
                      <div className="border-t border-gray-50 pt-2 space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{item.productName}</span>
                            <span className="font-semibold text-green-700 ml-2 whitespace-nowrap">{item.quantity} {item.unit}</span>
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

        {/* ── SETTINGS TAB ──────────────────────────────────── */}
        {tab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

            {/* Change Password */}
            <div className="card-lg space-y-4">
              <h2 className="section-title flex items-center gap-2">🔑 {t("change_password")}</h2>
              <form onSubmit={changePassword} className="space-y-3">
                {[
                  { label: t("current_password"), val: currentPwd, set: setCurrentPwd },
                  { label: t("new_password"), val: newPwd, set: setNewPwd },
                  { label: t("confirm_password"), val: confirmPwd, set: setConfirmPwd },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="label">{label}</label>
                    <input type="password" className="input-field" value={val}
                      onChange={(e) => { set(e.target.value); setPwdMsg({ text: "", error: false }); }} />
                  </div>
                ))}
                {pwdMsg.text && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${pwdMsg.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                    {pwdMsg.text}
                  </p>
                )}
                <button type="submit" disabled={pwdSaving} className="btn-primary pt-3">
                  {pwdSaving ? t("saving") : "🔐 " + t("update_password")}
                </button>
              </form>
            </div>

            {/* App Info */}
            <div className="card-lg bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <h2 className="section-title text-green-800 flex items-center gap-2">ℹ️ App Info</h2>
              <div className="space-y-3">
                {[
                  { label: "App", value: "NatureFarm v1.0" },
                  { label: "Platform", value: "Vercel (Free)" },
                  { label: "Database", value: "Google Sheets ✅" },
                  { label: "Auto Summary", value: "5:00 AM IST Daily" },
                  { label: "Telegram", value: "Connected ✅" },
                  { label: "Languages", value: "English + हिंदी" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-green-100 last:border-0 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-green-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
