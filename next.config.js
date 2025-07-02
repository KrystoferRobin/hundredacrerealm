/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'standalone', // Disabled to fix file system isolation issues
  // output: 'export', // Removed to enable SSR
}

module.exports = nextConfig 