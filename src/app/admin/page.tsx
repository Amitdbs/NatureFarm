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
    if (!password) {
      setError(t("required_field"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Store the password in sessionStorage for subsequent admin API calls
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
    <main className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t("admin_login")}</h1>
          <p className="text-green-200 text-sm mt-1">{t("app_name")}</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field pr-12"
                  placeholder={t("password_placeholder")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-1.5 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🌀</span>
                  {t("logging_in")}
                </span>
              ) : (
                t("login")
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-green-200 hover:text-white text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
