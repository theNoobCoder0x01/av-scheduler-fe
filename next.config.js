/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.cache = false;
    }
    return config;
  },
  
  // CRITICAL: Always export static files for Electron
  output: "export",
  
  // Ensure trailing slash is false for proper routing
  trailingSlash: false,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  
  // Configure asset prefix for proper static file serving
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
};

module.exports = nextConfig;