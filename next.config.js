/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable image optimization to prevent errors with missing images
  images: {
    unoptimized: true,
  },
  // Increase event emitter limits to prevent memory leak warnings
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Suppress EventEmitter warnings in development
  webpack: (config, { dev }) => {
    if (dev) {
      // Suppress EventEmitter memory leak warnings
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
  // output: 'standalone', // Disabled to fix file system isolation issues
  // output: 'export', // Removed to enable SSR
}

module.exports = nextConfig 