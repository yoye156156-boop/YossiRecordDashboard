import { NextResponse } from "next/server";
import { loadSessions, clearSessions, saveSession } from "@/lib/sessions.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(loadSessions());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const b = (raw ?? {}) as { id?: unknown; at?: unknown; lines?: unknown };

    const id =
      typeof b.id === "string" && b.id.trim() ? b.id : Date.now().toString();

    const at =
      typeof b.at === "string" && !Number.isNaN(Date.parse(b.at))
        ? b.at
        : new Date().toISOString();

    const lines: string[] =
      Array.isArray(b.lines) && b.lines.every((x) => typeof x === "string")
        ? (b.lines as string[])
        : [];

    const saved = saveSession({ id, at, lines });
    return NextResponse.json({ ok: true, saved });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  try {
    clearSessions();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
