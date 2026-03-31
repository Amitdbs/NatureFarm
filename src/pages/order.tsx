import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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
  const router = useRouter();

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
  const filteredProducts =
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
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].unit = product.unit;
      } else {
        updated[index].productName = "";
        updated[index].unit = "";
      }
    }
    setItems(updated);
    const newErrors = { ...errors };
    delete newErrors[`item_${index}_product`];
    delete newErrors[`item_${index}_qty`];
    setErrors(newErrors);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("required_field");
    if (!contact.trim()) newErrors.contact = t("required_field");
    else if (!/^\d{10}$/.test(contact.trim())) newErrors.contact = t("invalid_contact");
    if (!orderDate) newErrors.orderDate = t("required_field");

    const validItems = items.filter((item) => item.productId && item.quantity);
    if (validItems.length === 0) newErrors.items = t("min_one_item");

    items.forEach((item, i) => {
      if (!item.productId) newErrors[`item_${i}_product`] = t("required_field");
      if (!item.quantity || parseFloat(item.quantity) <= 0)
        newErrors[`item_${i}_qty`] = t("required_field");
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        customerName: name.trim(),
        contactNumber: contact.trim(),
        orderDate,
        items: items
          .filter((item) => item.productId && item.quantity)
          .map((item) => ({
            productName: item.productName,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
          })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setOrderId(data.orderId);
      setStep("success");
    } catch {
      setErrors({ submit: t("error_generic") });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName("");
    setContact("");
    setOrderDate(today());
    setItems([{ productId: "", productName: "", quantity: "", unit: "" }]);
    setErrors({});
    setOrderId("");
    setStep("form");
  }

  if (step === "success") {
    return (
      <>
        <Head><title>Order Placed — NatureFarm</title></Head>
        <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="card text-center py-10">
              <div className="text-7xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">{t("order_success_title")}</h2>
              <p className="text-gray-600 mb-4">{t("order_success_msg")}</p>
              <div className="bg-green-50 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-gray-500">{t("order_id")}</p>
                <p className="font-mono font-bold text-green-700 text-sm">{orderId}</p>
              </div>
              <button onClick={resetForm} className="btn-primary">{t("place_another")}</button>
              <button onClick={() => router.push("/")} className="btn-secondary mt-3">
                ← {t("app_name")}
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Place Order — NatureFarm</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <main className="min-h-screen bg-green-50 pb-8">
        {/* Header */}
        <div className="bg-green-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
          <button onClick={() => router.push("/")} className="text-white/80 hover:text-white text-xl leading-none">
            ←
          </button>
          <h1 className="text-lg font-bold flex-1">{t("order_form_title")}</h1>
          <span className="text-2xl">🛒</span>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          <form onSubmit={handleSubmit} noValidate>
            {/* Customer Details */}
            <div className="card space-y-4">
              <h2 className="section-title">👤 {t("name")}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("name")} <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("contact")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder={t("contact_placeholder")}
                  value={contact}
                  maxLength={10}
                  onChange={(e) => { setContact(e.target.value.replace(/\D/g, "")); setErrors({ ...errors, contact: "" }); }}
                />
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("order_date")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={orderDate}
                  min={today()}
                  onChange={(e) => { setOrderDate(e.target.value); setErrors({ ...errors, orderDate: "" }); }}
                />
                {errors.orderDate && <p className="text-red-500 text-xs mt-1">{errors.orderDate}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title mb-0">🥬 {t("items")}</h2>
              </div>

              {/* Category filter */}
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                {(["all", "vegetable", "fruit"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilter(cat)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
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
                <div className="text-center py-6 text-gray-400">
                  <div className="text-3xl mb-2">⏳</div>
                  <p>Loading products...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Item {index + 1}
                        </span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 text-sm font-medium">
                            ✕ {t("remove")}
                          </button>
                        )}
                      </div>

                      <div>
                        <select
                          className="input-field text-sm"
                          value={item.productId}
                          onChange={(e) => updateItem(index, "productId", e.target.value)}
                        >
                          <option value="">{t("select_product")}</option>
                          {(filter === "all" ? activeProducts : filteredProducts).map((p) => (
                            <option key={p.id} value={p.id}>
                              {getProductName(p)} ({p.unit})
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_product`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_product`]}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
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
                        <div className="w-24">
                          <input type="text" className="input-field text-sm bg-gray-50 text-gray-500" value={item.unit || t("unit")} readOnly />
                        </div>
                      </div>
                    </div>
                  ))}

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

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {errors.submit}
              </div>
            )}

            <button type="submit" disabled={submitting || loadingProducts} className="btn-primary text-lg py-4">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span>⏳</span> {t("submitting")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>✅</span> {t("submit_order")}
                </span>
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
