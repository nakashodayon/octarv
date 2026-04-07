import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureResearchTables, researchSql as sql } from "@/lib/research-db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const rows = await sql`
    SELECT id, name, prompt, tag_hints, target_folder_ids, schedule_hour, enabled, min_likes, min_retweets, min_replies, created_at
    FROM research_projects
    WHERE user_id = ${session.userId}
    ORDER BY created_at ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const { name, prompt, tagHints, targetFolderIds, scheduleHour, minLikes, minRetweets, minReplies } = await req.json();
  if (!name?.trim() || !prompt?.trim()) {
    return NextResponse.json({ error: "Missing name or prompt" }, { status: 400 });
  }
  const tags = Array.isArray(tagHints) ? tagHints : [];
  const folders = Array.isArray(targetFolderIds) ? targetFolderIds : [];
  const hour = Number.isFinite(scheduleHour) ? Math.max(0, Math.min(23, scheduleHour)) : 9;
  const ml = Number.isFinite(minLikes) ? Math.max(0, minLikes) : 0;
  const mrt = Number.isFinite(minRetweets) ? Math.max(0, minRetweets) : 0;
  const mrp = Number.isFinite(minReplies) ? Math.max(0, minReplies) : 0;

  const rows = await sql`
    INSERT INTO research_projects (user_id, name, prompt, tag_hints, target_folder_ids, schedule_hour, min_likes, min_retweets, min_replies)
    VALUES (
      ${session.userId},
      ${name.trim()},
      ${prompt.trim()},
      ${JSON.stringify(tags)}::jsonb,
      ${JSON.stringify(folders)}::jsonb,
      ${hour},
      ${ml},
      ${mrt},
      ${mrp}
    )
    RETURNING id, name, prompt, tag_hints, target_folder_ids, schedule_hour, enabled, created_at
  `;
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const { id, name, prompt, tagHints, targetFolderIds, scheduleHour, enabled, minLikes, minRetweets, minReplies } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (typeof name === "string" && name.trim()) {
    await sql`UPDATE research_projects SET name = ${name.trim()} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (typeof prompt === "string" && prompt.trim()) {
    await sql`UPDATE research_projects SET prompt = ${prompt.trim()} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Array.isArray(tagHints)) {
    await sql`UPDATE research_projects SET tag_hints = ${JSON.stringify(tagHints)}::jsonb WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Array.isArray(targetFolderIds)) {
    await sql`UPDATE research_projects SET target_folder_ids = ${JSON.stringify(targetFolderIds)}::jsonb WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Number.isFinite(scheduleHour)) {
    const h = Math.max(0, Math.min(23, scheduleHour));
    await sql`UPDATE research_projects SET schedule_hour = ${h} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (typeof enabled === "boolean") {
    await sql`UPDATE research_projects SET enabled = ${enabled} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Number.isFinite(minLikes)) {
    await sql`UPDATE research_projects SET min_likes = ${Math.max(0, minLikes)} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Number.isFinite(minRetweets)) {
    await sql`UPDATE research_projects SET min_retweets = ${Math.max(0, minRetweets)} WHERE id = ${id} AND user_id = ${session.userId}`;
  }
  if (Number.isFinite(minReplies)) {
    await sql`UPDATE research_projects SET min_replies = ${Math.max(0, minReplies)} WHERE id = ${id} AND user_id = ${session.userId}`;
  }

  const rows = await sql`
    SELECT id, name, prompt, tag_hints, target_folder_ids, schedule_hour, enabled, min_likes, min_retweets, min_replies, created_at
    FROM research_projects WHERE id = ${id} AND user_id = ${session.userId}
  `;
  return NextResponse.json(rows[0] ?? null);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureResearchTables();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await sql`DELETE FROM research_runs WHERE project_id = ${id} AND user_id = ${session.userId}`;
  await sql`DELETE FROM research_projects WHERE id = ${id} AND user_id = ${session.userId}`;
  return NextResponse.json({ ok: true });
}
