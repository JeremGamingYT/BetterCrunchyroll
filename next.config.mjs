/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for extension compatibility
  images: {
    unoptimized: true,
  },

  // Ignore TypeScript errors during build (development convenience)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
