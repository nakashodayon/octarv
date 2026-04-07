import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { importBookmarks } from "@/lib/bookmarks-pipeline";
import { ensureXOauthTable } from "@/lib/x-oauth";

const sql = neon(process.env.DATABASE_URL!);

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureXOauthTable();

  const users = await sql`
    SELECT user_id, last_imported_tweet_id
    FROM bookmark_import_state
    WHERE enabled = true
  `;

  const summary: Array<{ user: string; result?: any; error?: string }> = [];

  for (const u of users) {
    const userId = (u as any).user_id;
    const sinceTweetId = (u as any).last_imported_tweet_id;
    try {
      const result = await importBookmarks(userId, {
        limit: 100,
        sinceTweetId,
      });
      summary.push({ user: userId, result });
    } catch (e: any) {
      summary.push({ user: userId, error: e?.message ?? "unknown" });
      console.error("[cron/bookmarks] user failed:", userId, e);
    }
  }

  return NextResponse.json({ users: users.length, summary });
}
