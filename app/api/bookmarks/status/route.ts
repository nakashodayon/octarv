import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";
import { ensureXOauthTable } from "@/lib/x-oauth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureXOauthTable();

  const tokens = await sql`
    SELECT x_username, expires_at FROM x_oauth_tokens WHERE user_id = ${session.userId}
  `;

  const state = await sql`
    SELECT last_imported_tweet_id, last_run_at, enabled, default_folder_id
    FROM bookmark_import_state WHERE user_id = ${session.userId}
  `;

  return NextResponse.json({
    connected: tokens.length > 0,
    xUsername: tokens[0]?.x_username ?? null,
    state: state[0] ?? null,
  });
}
