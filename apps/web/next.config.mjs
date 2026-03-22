/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile shared packages from the monorepo
  transpilePackages: ['@cashly/types'],
}

export default nextConfig
