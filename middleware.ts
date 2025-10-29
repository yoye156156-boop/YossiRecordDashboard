import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ⚠️ תן הרשאה מפורשת ל-WS המקומי (8787) ול-HTTP לאותו פורט אם צריך
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws://localhost:8787 http://localhost:8787",
    "font-src 'self' data:",
    "frame-ancestors 'self'"
  ].join('; ');

  // ✅ אפשר מיקרופון בלוקאל-הוסט
  // אפשרות שמרנית:
  //   microphone=(self "http://localhost")
  // אם תרצה לפשט, אפשר גם:
  //   microphone=*
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Permissions-Policy', 'microphone=(self "http://localhost")');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');

  return res;
}

export const config = { matcher: '/:path*' };
