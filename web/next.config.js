/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Esporta un sito statico in `out/` (la landing non richiede runtime server).
  output: 'export',
  images: { unoptimized: true },
};

module.exports = nextConfig;
