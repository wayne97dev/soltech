/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export a static site to `out/` (the site needs no server runtime).
  output: 'export',
  // Emit each route as <route>/index.html for robust static hosting.
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
