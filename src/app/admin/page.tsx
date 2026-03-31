"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError(t("required_field")); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("nf_admin_pwd", password);
        router.push("/admin/dashboard");
      } else {
        setError(t("invalid_password"));
      }
    } catch {
      setError(t("error_generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 flex items-center justify-center p-5">

      {/* Card — narrow on mobile, a bit wider on tablet */}
      <div className="w-full max-w-sm sm:max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-green-900/40">
            <span className="text-4xl sm:text-5xl">🔐</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t("admin_login")}</h1>
          <p className="text-green-200 text-sm mt-1">{t("app_name")}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field pr-12 text-base"
                  placeholder={t("password_placeholder")}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-sm">
                  <span>⚠️</span> {error}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary py-4 text-base">
              {loading
                ? <><span className="animate-spin inline-block">🌀</span> {t("logging_in")}</>
                : <><span>🔑</span> {t("login")}</>
              }
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-green-200 hover:text-white text-sm transition-colors flex items-center justify-center gap-1">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
