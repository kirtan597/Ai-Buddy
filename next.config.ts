import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable prod source maps — cuts JS bundle size ~15%
  productionBrowserSourceMaps: false,

  // Enable gzip/brotli response compression
  compress: true,

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
    // Turbopack: deduplicate framer-motion to prevent double-bundling
    turbo: {
      resolveAlias: {
        'framer-motion': 'framer-motion',
      },
    },
  },

  images: {
    // Modern format — serves WebP/AVIF automatically
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.openrouter.ai',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },

  // Security + performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;

