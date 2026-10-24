/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable image optimization for static export if using next/image (we aren't, but good practice)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
