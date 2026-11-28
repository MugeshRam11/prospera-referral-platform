/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  env: { NEXT_PUBLIC_CLIENT_BETA: process.env.CLIENT_BETA === 'true' ? 'true' : 'false' },
  ...(process.env.CLIENT_BETA === 'true' ? { experimental: { cpus: 2 } } : {}),
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.BETA_API_ORIGIN
          ? `${process.env.BETA_API_ORIGIN}/api/v1/:path*`
          : process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
          : 'http://127.0.0.1:3100/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
