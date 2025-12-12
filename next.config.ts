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

    // Fix for React Native dependencies in browser environment
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    // Fallback for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
