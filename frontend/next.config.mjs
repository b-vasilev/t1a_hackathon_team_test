/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/about', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
