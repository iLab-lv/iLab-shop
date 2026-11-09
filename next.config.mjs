/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/shop',
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }];
  },
};

export default nextConfig;
