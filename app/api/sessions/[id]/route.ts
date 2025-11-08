import { NextResponse } from "next/server";
import { removeSession } from "@/lib/sessions.js";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    // חילוץ ה-id מהנתיב: /api/sessions/:id
    const m = url.pathname.match(/\/api\/sessions\/([^/]+)$/);
    const id = m?.[1] ? decodeURIComponent(m[1]) : "";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing id" },
        { status: 400 },
      );
    }

    const { removed } = removeSession(id);
    return NextResponse.json({ ok: true, removed, id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
