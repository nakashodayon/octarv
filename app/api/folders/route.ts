import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE folders ADD COLUMN IF NOT EXISTS match_tags JSONB DEFAULT '[]'::jsonb`;
}

// GET /api/folders — list folders for current user (auto-seed Work on first load)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTable();

  let rows = await sql`
    SELECT id, name, match_tags, created_at
    FROM folders
    WHERE user_id = ${session.userId}
    ORDER BY created_at ASC
  `;

  if (rows.length === 0) {
    await sql`
      INSERT INTO folders (user_id, name) VALUES (${session.userId}, 'Work')
    `;
    rows = await sql`
      SELECT id, name, match_tags, created_at
      FROM folders
      WHERE user_id = ${session.userId}
      ORDER BY created_at ASC
    `;
  }

  return NextResponse.json(rows);
}

// POST /api/folders — create a new folder
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, matchTags } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  await ensureTable();

  const tags = Array.isArray(matchTags) ? matchTags : [];
  const rows = await sql`
    INSERT INTO folders (user_id, name, match_tags)
    VALUES (${session.userId}, ${name.trim()}, ${JSON.stringify(tags)}::jsonb)
    RETURNING id, name, match_tags, created_at
  `;

  return NextResponse.json(rows[0]);
}

// PATCH /api/folders — update name or match_tags
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, matchTags } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await ensureTable();

  if (typeof name === "string" && name.trim()) {
    await sql`
      UPDATE folders SET name = ${name.trim()}
      WHERE id = ${id} AND user_id = ${session.userId}
    `;
  }
  if (Array.isArray(matchTags)) {
    await sql`
      UPDATE folders SET match_tags = ${JSON.stringify(matchTags)}::jsonb
      WHERE id = ${id} AND user_id = ${session.userId}
    `;
  }

  const rows = await sql`
    SELECT id, name, match_tags, created_at
    FROM folders WHERE id = ${id} AND user_id = ${session.userId}
  `;
  return NextResponse.json(rows[0] ?? null);
}

// DELETE /api/folders?id=xxx — delete folder
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await sql`
    DELETE FROM folders
    WHERE id = ${id} AND user_id = ${session.userId}
  `;

  return NextResponse.json({ ok: true });
}
