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
  // output: 'standalone', // Disabled to fix file system isolation issues
  // output: 'export', // Removed to enable SSR
}

module.exports = nextConfig 