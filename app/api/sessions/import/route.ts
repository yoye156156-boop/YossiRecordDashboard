import { NextResponse } from 'next/server';
import { importSessions } from '@/lib/sessions.js';

export const runtime = 'nodejs';

type ImportPayload = { sessions?: Array<{ id?: string; at?: string; lines?: string[] }> } | Array<{ id?: string; at?: string; lines?: string[] }>;

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const stats = importSessions(raw as ImportPayload);
    return NextResponse.json({ ok: true, ...stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
