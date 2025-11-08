import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  try {
    const mem = process.memoryUsage();
    return NextResponse.json({
      ok: true,
      now: new Date().toISOString(),
      uptime_s: Math.round(process.uptime()),
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_mb: Math.round(mem.heapUsed / 1024 / 1024),
      node: process.version,
      env: process.env.NODE_ENV ?? "development",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
