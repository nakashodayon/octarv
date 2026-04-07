import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureResearchTables, researchSql as sql } from "@/lib/research-db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const { id } = await ctx.params;
  const rows = await sql`
    SELECT id, project_id, status, markdown, error, started_at, finished_at
    FROM research_runs
    WHERE id = ${id} AND user_id = ${session.userId}
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
