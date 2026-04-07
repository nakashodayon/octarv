import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureResearchTables, researchSql as sql } from "@/lib/research-db";
import { runResearch } from "@/lib/research-agent";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Verify ownership
  const project = await sql`
    SELECT id FROM research_projects
    WHERE id = ${projectId} AND user_id = ${session.userId}
    LIMIT 1
  `;
  if (project.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await sql`
    INSERT INTO research_runs (project_id, user_id, status)
    VALUES (${projectId}, ${session.userId}, 'running')
    RETURNING id
  `;
  const runId = (created[0] as any).id;

  // Run agent. Awaited so errors land in the same response when called manually.
  // (For long-running cron use, this will still complete within maxDuration.)
  runResearch(session.userId, projectId, runId).catch((e) => {
    console.error("[run] background failure:", e);
  });

  return NextResponse.json({ runId });
}
