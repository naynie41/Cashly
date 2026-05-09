/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Transpile shared packages from the monorepo
  transpilePackages: ['@cashly/types'],
}

export default nextConfig
