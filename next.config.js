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
  // Remove output: "export" for local development
  // This will be added back for electron builds
  ...(process.env.NODE_ENV === 'production' && process.env.BUILD_TARGET === 'electron' 
    ? { output: "export" } 
    : {}),
  
  // Add rewrites for API calls in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8082/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;