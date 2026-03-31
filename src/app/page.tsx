"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 flex flex-col items-center justify-between p-6">
      {/* Language Switcher */}
      <div className="w-full max-w-sm flex justify-end">
        <div className="flex bg-white/20 rounded-full p-1 backdrop-blur-sm">
          <button
            onClick={() => setLocale("en")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
              locale === "en"
                ? "bg-white text-green-700 shadow"
                : "text-white hover:bg-white/20"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("hi")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
              locale === "hi"
                ? "bg-white text-green-700 shadow"
                : "text-white hover:bg-white/20"
            }`}
          >
            हिं
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full max-w-sm py-8">
        {/* Logo */}
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-green-900/40">
          <span className="text-6xl">🌿</span>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {t("app_name")}
          </h1>
          <p className="mt-2 text-green-100 text-base font-medium">
            {t("tagline")}
          </p>
        </div>

        {/* Decorative icons */}
        <div className="flex gap-4 text-3xl opacity-80">
          <span>🥦</span>
          <span>🍅</span>
          <span>🥕</span>
          <span>🍋</span>
          <span>🥭</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm flex flex-col gap-4 pb-8">
        <Link href="/order">
          <button className="w-full bg-white text-green-700 font-bold text-xl py-5 rounded-2xl shadow-xl active:scale-95 transition-all duration-150 flex items-center justify-center gap-3">
            <span className="text-2xl">🛒</span>
            {t("place_order")}
          </button>
        </Link>

        <Link href="/admin">
          <button className="w-full bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white font-semibold text-lg py-4 rounded-2xl backdrop-blur-sm active:scale-95 transition-all duration-150 flex items-center justify-center gap-3">
            <span className="text-xl">🔐</span>
            {t("admin")}
          </button>
        </Link>
      </div>
    </main>
  );
}
