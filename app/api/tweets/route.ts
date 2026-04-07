import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";
import { buildXUrl, normalizeXResponse } from "@/lib/x";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS saved_tweets (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      tweet_data JSONB NOT NULL,
      tags JSONB,
      folder_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, tweet_id, folder_id)
    )
  `;
  await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS tags JSONB`;
  await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS folder_id TEXT`;
  await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS ai_title TEXT`;
  await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS ai_description TEXT`;
  // Drop old unique constraint that didn't include folder_id
  await sql`ALTER TABLE saved_tweets DROP CONSTRAINT IF EXISTS saved_tweets_user_id_tweet_id_key`;
  // Add new unique constraint including folder_id
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'saved_tweets_user_tweet_folder_key'
      ) THEN
        ALTER TABLE saved_tweets
        ADD CONSTRAINT saved_tweets_user_tweet_folder_key UNIQUE (user_id, tweet_id, folder_id);
      END IF;
    END $$
  `;
}

// GET /api/tweets?folderId=xxx — list saved tweets (filter by folder, omit for all)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTable();

  const folderId = req.nextUrl.searchParams.get("folderId");

  let rows;
  if (folderId) {
    // Look up the folder's match_tags so we can also include tweets that match by tag.
    const folderRows = await sql`
      SELECT match_tags FROM folders
      WHERE id = ${folderId} AND user_id = ${session.userId}
      LIMIT 1
    `;
    const matchTags: string[] = (folderRows[0] as any)?.match_tags ?? [];

    rows = matchTags.length > 0
      ? await sql`
          SELECT DISTINCT ON (tweet_id) tweet_id, tweet_data, tags, folder_id, ai_title, ai_description, created_at
          FROM saved_tweets
          WHERE user_id = ${session.userId}
            AND (folder_id = ${folderId} OR tags ?| ${matchTags as any})
          ORDER BY tweet_id, created_at DESC
        `
      : await sql`
          SELECT tweet_id, tweet_data, tags, folder_id, ai_title, ai_description, created_at
          FROM saved_tweets
          WHERE user_id = ${session.userId} AND folder_id = ${folderId}
          ORDER BY created_at DESC
        `;
  } else {
    rows = await sql`
        SELECT tweet_id, tweet_data, tags, folder_id, ai_title, ai_description, created_at
        FROM saved_tweets
        WHERE user_id = ${session.userId}
        ORDER BY created_at DESC
      `;
  }

  return NextResponse.json(rows);
}

// PUT /api/tweets — update tags for a saved tweet
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tweetId, tags } = await req.json();
  if (!tweetId || !Array.isArray(tags)) {
    return NextResponse.json({ error: "Missing tweetId or tags" }, { status: 400 });
  }

  await ensureTable();

  await sql`
    UPDATE saved_tweets
    SET tags = ${JSON.stringify(tags)}::jsonb
    WHERE tweet_id = ${tweetId} AND user_id = ${session.userId}
  `;

  return NextResponse.json({ ok: true, tags });
}

// POST /api/tweets — fetch from X API and save
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tweetId, folderId } = await req.json();
  if (!tweetId) return NextResponse.json({ error: "Missing tweetId" }, { status: 400 });
  if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });

  const xRes = await fetch(buildXUrl(tweetId).toString(), {
    headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
  });

  if (!xRes.ok) {
    return NextResponse.json({ error: "Failed to fetch tweet from X" }, { status: xRes.status });
  }

  const json = await xRes.json();
  const tweetData = normalizeXResponse(json);
  if (!tweetData) return NextResponse.json({ error: "Tweet not found" }, { status: 404 });

  await ensureTable();

  await sql`
    INSERT INTO saved_tweets (user_id, tweet_id, tweet_data, tags, folder_id)
    VALUES (${session.userId}, ${tweetId}, ${JSON.stringify(tweetData)}, NULL, ${folderId})
    ON CONFLICT (user_id, tweet_id, folder_id) DO UPDATE SET tweet_data = EXCLUDED.tweet_data
  `;

  return NextResponse.json(tweetData);
}
