/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export a static site to `out/` (the site needs no server runtime).
  output: 'export',
  // Emit each route as <route>/index.html for robust static hosting.
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config) => {
    // Optional deps pulled transitively by the wallet stack (WalletConnect /
    // MetaMask SDK) that the browser build doesn't need — mark them external /
    // stubbed so the build doesn't emit "module not found" warnings.
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

module.exports = nextConfig;
