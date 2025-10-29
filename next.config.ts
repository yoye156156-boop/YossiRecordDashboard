import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self' " +
                "ws://localhost:8787 http://localhost:8787 " +
                "ws://127.0.0.1:8787 http://127.0.0.1:8787 " +
                "ws://[::1]:8787 http://[::1]:8787; " +
              "font-src 'self' data:; " +
              "frame-ancestors 'self'"
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self "http://localhost" "http://127.0.0.1" "http://[::1]")'
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
