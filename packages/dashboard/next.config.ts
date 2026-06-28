import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',                    // static export for Pages
  reactStrictMode: true,               // catch bugs in dev
  trailingSlash: true,                 // /page/ not /page
  images: {
    unoptimized: true,                 // no image optimization (static export)
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
}

export default nextConfig
