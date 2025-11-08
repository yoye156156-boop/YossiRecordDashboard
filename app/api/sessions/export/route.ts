import { NextResponse } from "next/server";
import { exportSessions } from "@/lib/sessions.js";

export const runtime = "nodejs";

export async function GET() {
  const data = exportSessions();
  const body = JSON.stringify({ sessions: data }, null, 2);
  const res = new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sessions-export.json"`,
      "Cache-Control": "no-store",
    },
  });
  return res;
}
