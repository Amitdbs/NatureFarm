"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface Product {
  id: string;
  name: string;
  nameHi: string;
  category: "vegetable" | "fruit";
  unit: string;
  active: boolean;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
}

type Step = "form" | "success";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function OrderPage() {
  const { t, locale } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [filter, setFilter] = useState<"all" | "vegetable" | "fruit">("all");

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [items, setItems] = useState<OrderItem[]>([
    { productId: "", productName: "", quantity: "", unit: "" },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .finally(() => setLoadingProducts(false));
  }, []);

  const activeProducts = products.filter((p) => p.active);
  const displayProducts =
    filter === "all"
      ? activeProducts
      : activeProducts.filter((p) => p.category === filter);

  function getProductName(product: Product) {
    return locale === "hi" && product.nameHi ? product.nameHi : product.name;
  }

  function addItem() {
    setItems([...items, { productId: "", productName: "", quantity: "", unit: "" }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") {
      const p = products.find((p) => p.id === value);
      updated[index].productName = p ? p.name : "";
      updated[index].unit = p ? p.unit : "";
    }
    setItems(updated);
    const e = { ...errors };
    delete e[`item_${index}_product`];
    delete e[`item_${index}_qty`];
    setErrors(e);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t("required_field");
    if (!contact.trim()) e.contact = t("required_field");
    else if (!/^\d{10}$/.test(contact.trim())) e.contact = t("invalid_contact");
    if (!orderDate) e.orderDate = t("required_field");
    if (!items.some((i) => i.productId && i.quantity)) e.items = t("min_one_item");
    items.forEach((item, i) => {
      if (!item.productId) e[`item_${i}_product`] = t("required_field");
      if (!item.quantity || parseFloat(item.quantity) <= 0) e[`item_${i}_qty`] = t("required_field");
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          contactNumber: contact.trim(),
          orderDate,
          items: items
            .filter((i) => i.productId && i.quantity)
            .map((i) => ({ productName: i.productName, quantity: parseFloat(i.quantity), unit: i.unit })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderId(data.orderId);
      setStep("success");
    } catch {
      setErrors({ submit: t("error_generic") });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName(""); setContact(""); setOrderDate(today());
    setItems([{ productId: "", productName: "", quantity: "", unit: "" }]);
    setErrors({}); setOrderId(""); setStep("form");
  }

  /* ── Success ─────────────────────────────────────────────────── */
  if (step === "success") {
    return (
      <main className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-lg text-center py-10 sm:py-14">
            <div className="text-7xl mb-4">✅</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-green-700 mb-2">{t("order_success_title")}</h2>
            <p className="text-gray-500 mb-5 text-sm sm:text-base">{t("order_success_msg")}</p>
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-6 inline-block mx-auto">
              <p className="text-xs text-gray-400 mb-0.5">{t("order_id")}</p>
              <p className="font-mono font-bold text-green-700">{orderId}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button onClick={resetForm} className="btn-primary">🛒 {t("place_another")}</button>
              <Link href="/" className="btn-secondary">← {t("app_name")}</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Form ─────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-green-50 pb-10">

      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-md">
        <Link href="/" className="text-white/80 hover:text-white text-2xl leading-none w-8 flex-shrink-0">←</Link>
        <h1 className="text-lg sm:text-xl font-bold flex-1 truncate">{t("order_form_title")}</h1>
        <span className="text-2xl">🛒</span>
      </div>

      {/* Content */}
      <div className="page-wrapper-wide pt-6 space-y-5">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Customer Details ──────────────────────────────── */}
          <div className="card-lg space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <span>👤</span> Customer Details
            </h2>

            {/* Name + Contact — side by side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("name")} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t("name_placeholder")}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: "" }); }}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="label">{t("contact")} <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="input-field"
                  placeholder={t("contact_placeholder")}
                  value={contact}
                  maxLength={10}
                  onChange={(e) => { setContact(e.target.value.replace(/\D/g, "")); setErrors({ ...errors, contact: "" }); }}
                />
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
              </div>
            </div>

            {/* Order Date — full width, fixed height */}
            <div>
              <label className="label">{t("order_date")} <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="date"
                  className="input-field"
                  value={orderDate}
                  min={today()}
                  onChange={(e) => { setOrderDate(e.target.value); setErrors({ ...errors, orderDate: "" }); }}
                  style={{ colorScheme: "light" }}
                />
              </div>
              {errors.orderDate && <p className="text-red-500 text-xs mt-1">{errors.orderDate}</p>}
            </div>
          </div>

          {/* ── Items ─────────────────────────────────────────── */}
          <div className="card-lg">
            <h2 className="section-title flex items-center gap-2 mb-4">
              <span>🥬</span> {t("items")}
            </h2>

            {/* Category tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              {(["all", "vegetable", "fruit"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    filter === cat ? "bg-white text-green-700 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {cat === "all" ? t("all_items") : cat === "vegetable" ? "🥦 " + t("vegetables") : "🍎 " + t("fruits")}
                </button>
              ))}
            </div>

            {errors.items && (
              <p className="text-red-500 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{errors.items}</p>
            )}

            {loadingProducts ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2 animate-pulse">🌿</div>
                <p className="text-sm">Loading products...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Items grid — 1 col mobile, 2 col on lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-2.5"
                    >
                      {/* Item header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          Item {index + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium flex items-center gap-1"
                          >
                            ✕ {t("remove")}
                          </button>
                        )}
                      </div>

                      {/* Product select */}
                      <div>
                        <select
                          className="input-field text-sm"
                          value={item.productId}
                          onChange={(e) => updateItem(index, "productId", e.target.value)}
                        >
                          <option value="">{t("select_product")}</option>
                          {displayProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {getProductName(p)} — {p.unit}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_product`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_product`]}</p>
                        )}
                      </div>

                      {/* Quantity + Unit */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            className="input-field text-sm"
                            placeholder={t("enter_quantity")}
                            value={item.quantity}
                            min="0"
                            step="0.5"
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                          {errors[`item_${index}_qty`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_qty`]}</p>
                          )}
                        </div>
                        <div className="w-20 sm:w-24">
                          <div className="input-field text-sm bg-gray-50 text-gray-500 text-center cursor-default">
                            {item.unit || t("unit")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add item button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full border-2 border-dashed border-green-300 text-green-600 font-medium py-3 rounded-xl hover:bg-green-50 active:scale-95 transition-all duration-150 text-sm"
                >
                  {t("add_item")}
                </button>
              </div>
            )}
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {errors.submit}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || loadingProducts}
            className="btn-primary text-base sm:text-lg py-4"
          >
            {submitting ? <><span className="animate-spin inline-block">🌀</span> {t("submitting")}</> : <>✅ {t("submit_order")}</>}
          </button>

        </form>
      </div>
    </main>
  );
}
