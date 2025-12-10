import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable empty Turbopack configuration to silence warning
  turbopack: {},

  // Webpack configuration for compatibility
  webpack: (config, { isServer }) => {
    // Fix for build errors with pino dependencies
    if (isServer) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }

    return config;
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
