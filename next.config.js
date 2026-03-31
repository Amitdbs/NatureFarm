/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only treat files ending in .page.tsx/.page.ts as Pages Router pages.
  // This prevents the leftover src/pages/ files from conflicting with App Router.
  // _app, _document, _error are always included regardless of this setting.
  pageExtensions: ["page.tsx", "page.ts", "page.jsx", "page.js"],
};

module.exports = nextConfig;
