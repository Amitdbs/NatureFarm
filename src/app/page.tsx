"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 flex flex-col">

      {/* Top bar */}
      <div className="flex justify-between items-center px-5 pt-5 pb-2">
        <div className="flex items-center gap-2 text-white/80">
          <span className="text-xl">🌿</span>
          <span className="text-sm font-semibold tracking-wide">{t("app_name")}</span>
        </div>
        {/* Language switcher */}
        <div className="flex bg-white/20 rounded-full p-1 backdrop-blur-sm">
          {(["en", "hi"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLocale(lang)}
              className={`px-3.5 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                locale === lang ? "bg-white text-green-700 shadow" : "text-white hover:bg-white/20"
              }`}
            >
              {lang === "en" ? "EN" : "हिं"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero — centres vertically, scales on large screens */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">

        {/* Logo */}
        <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-green-900/40 mb-6 sm:mb-8">
          <span className="text-6xl sm:text-7xl lg:text-8xl">🌿</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-3">
          {t("app_name")}
        </h1>
        <p className="text-green-100 text-base sm:text-lg lg:text-xl font-medium max-w-sm sm:max-w-md mb-8">
          {t("tagline")}
        </p>

        {/* Decorative icons */}
        <div className="flex gap-3 sm:gap-4 text-3xl sm:text-4xl opacity-80 mb-10 sm:mb-12">
          {["🥦", "🍅", "🥕", "🍋", "🥭", "🧅", "🫑"].map((emoji) => (
            <span key={emoji} className="hidden first:block sm:block [&:nth-child(-n+5)]:block">{emoji}</span>
          ))}
        </div>

        {/* Action buttons — stacked on mobile, side-by-side on sm+ */}
        <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md flex flex-col sm:flex-row gap-4">
          <Link href="/order" className="flex-1">
            <button className="w-full bg-white text-green-700 font-bold text-lg sm:text-xl py-5 sm:py-6 rounded-2xl shadow-xl active:scale-95 transition-all duration-150 flex items-center justify-center gap-3 hover:bg-green-50">
              <span className="text-2xl">🛒</span>
              {t("place_order")}
            </button>
          </Link>

          <Link href="/admin" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white font-semibold text-lg sm:text-xl py-5 sm:py-6 rounded-2xl backdrop-blur-sm active:scale-95 transition-all duration-150 flex items-center justify-center gap-3">
              <span className="text-xl">🔐</span>
              {t("admin")}
            </button>
          </Link>
        </div>

      </div>

      {/* Footer */}
      <p className="text-green-300/60 text-xs text-center pb-5">
        {t("app_name")} © {new Date().getFullYear()}
      </p>
    </main>
  );
}
