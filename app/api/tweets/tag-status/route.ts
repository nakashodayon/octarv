import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tweetId = req.nextUrl.searchParams.get("tweetId");
  if (!tweetId) return NextResponse.json({ error: "Missing tweetId" }, { status: 400 });

  const rows = await sql`
    SELECT tags FROM saved_tweets
    WHERE tweet_id = ${tweetId} AND user_id = ${session.userId}
  `;

  if (rows.length === 0) return NextResponse.json({ tags: null });

  const tags = rows[0].tags as string[] | null;
  return NextResponse.json({ tags: tags ?? null });
}
