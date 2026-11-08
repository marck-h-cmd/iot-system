/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    const backendTarget = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api/:path*';
    return [
      {
        source: '/api/:path*',
        destination: backendTarget,
      },
    ];
  },
};

module.exports = nextConfig;
