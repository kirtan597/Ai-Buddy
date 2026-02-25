import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.nip.io:3000',
        '*.nip.io',
        'kbotai.netlify.app',
        '*.netlify.app',
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
      {
        // OpenRouter / Cloudflare generated image URLs
        protocol: 'https',
        hostname: '**.openrouter.ai',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
};

export default nextConfig;

