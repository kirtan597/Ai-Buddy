import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.nip.io:3000',
        '*.nip.io',
        // Add your local network IP here if testing on mobile, e.g. 'http://192.168.x.x:3000'
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        // Google profile pictures (used in session/avatar display)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
