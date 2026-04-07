import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureResearchTables, researchSql as sql } from "@/lib/research-db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const rows = await sql`
    SELECT id, project_id, status, error, started_at, finished_at
    FROM research_runs
    WHERE user_id = ${session.userId} AND project_id = ${projectId}
    ORDER BY started_at DESC
  `;
  return NextResponse.json(rows);
}
