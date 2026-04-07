import { neon } from "@neondatabase/serverless";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import type { ImagePart, TextPart } from "ai";
import { z } from "zod";
import {
  EXPANSIONS,
  MEDIA_FIELDS,
  TWEET_FIELDS,
  USER_FIELDS,
  normalizeXResponse,
} from "@/lib/x";
import { getValidTokens } from "@/lib/x-oauth";

const sql = neon(process.env.DATABASE_URL!);

const TagSchema = z.object({
  title: z.string().describe("Original synthesized title, 5-12 words. Not a copy."),
  description: z
    .string()
    .describe("Outside-perspective summary, 1-2 sentences, same language as post."),
  tags: z.array(z.string()).describe("3-8 lowercase concise tags."),
});

interface BookmarkTweet {
  raw: any; // X API tweet object
  includes: any; // X API includes object (shared across page)
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// Fetch a page of bookmarks for a user
export async function fetchBookmarks(
  userId: string,
  options: { maxResults?: number; paginationToken?: string } = {}
): Promise<{ tweets: BookmarkTweet[]; nextToken?: string }> {
  const tokens = await getValidTokens(userId);
  if (!tokens) throw new Error("X account not connected");

  const url = new URL(`https://api.twitter.com/2/users/${tokens.x_user_id}/bookmarks`);
  url.searchParams.set("max_results", String(options.maxResults ?? 20));
  url.searchParams.set("tweet.fields", TWEET_FIELDS);
  url.searchParams.set("user.fields", USER_FIELDS);
  url.searchParams.set("media.fields", MEDIA_FIELDS);
  url.searchParams.set("expansions", EXPANSIONS);
  if (options.paginationToken) {
    url.searchParams.set("pagination_token", options.paginationToken);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bookmarks fetch failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const tweets: BookmarkTweet[] = (json.data ?? []).map((t: any) => ({
    raw: t,
    includes: json.includes ?? {},
  }));
  return { tweets, nextToken: json.meta?.next_token };
}

// Save a single tweet to a folder. Idempotent — skips if already saved.
async function saveTweet(
  userId: string,
  folderId: string,
  tweet: BookmarkTweet
): Promise<"imported" | "skipped"> {
  // Build the X-API-shaped wrapper that normalizeXResponse expects
  const wrapped = { data: tweet.raw, includes: tweet.includes };
  const normalized = normalizeXResponse(wrapped);
  if (!normalized) return "skipped";

  const existing = await sql`
    SELECT id, ai_title FROM saved_tweets
    WHERE user_id = ${userId} AND tweet_id = ${normalized.id} AND folder_id = ${folderId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return "skipped";
  }

  await sql`
    INSERT INTO saved_tweets (user_id, tweet_id, tweet_data, tags, folder_id)
    VALUES (${userId}, ${normalized.id}, ${JSON.stringify(normalized)}, NULL, ${folderId})
    ON CONFLICT (user_id, tweet_id, folder_id) DO NOTHING
  `;

  return "imported";
}

// Run Grok tagging on a tweet (skips if already has ai_title)
async function tagTweet(userId: string, tweetId: string) {
  const rows = await sql`
    SELECT tweet_data, ai_title FROM saved_tweets
    WHERE tweet_id = ${tweetId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) return;
  if ((rows[0] as any).ai_title) return; // already tagged

  const tweetData = (rows[0] as any).tweet_data;

  // Existing user tags for reuse
  let existingTags: string[] = [];
  try {
    const tagRows = await sql`
      SELECT DISTINCT jsonb_array_elements_text(tags) AS tag
      FROM saved_tweets
      WHERE user_id = ${userId} AND tags IS NOT NULL AND jsonb_array_length(tags) > 0
    `;
    existingTags = tagRows.map((r: any) => r.tag as string);
  } catch {}

  const mediaImages = (tweetData.media ?? []).filter(
    (m: any) => (m.url || m.previewUrl) && m.type !== "video"
  );
  const mediaVideos = (tweetData.media ?? []).filter((m: any) => m.type === "video");
  const authorHandle = tweetData.author?.username ?? "";
  const tweetText = tweetData.text ?? "";

  const systemPrompt = [
    "You are a smart content curator generating bookmark metadata.",
    "For the given social post, generate a title, description, and tags.",
    existingTags.length > 0
      ? `Existing tags in this library (reuse when relevant): ${existingTags.join(", ")}.`
      : "",
    "TITLE: 5-12 words. Original synthesis, NOT a copy.",
    "DESCRIPTION: 1-2 sentences from an OUTSIDE perspective. Wikipedia summary style.",
    "Use the SAME LANGUAGE as the original post.",
    "TAGS: 3-8 concise lowercase tags. Prefer specific over generic.",
  ]
    .filter(Boolean)
    .join(" ");

  const contentParts: (TextPart | ImagePart)[] = [
    {
      type: "text",
      text: `Post by @${authorHandle}:\n\n${tweetText}${mediaVideos.length > 0 ? "\n\n[contains video]" : ""}`,
    },
    ...mediaImages.map((m: any) => ({
      type: "image" as const,
      image: (m.url ?? m.previewUrl) as string,
    })),
  ];

  const { object } = await generateObject({
    model: xai("grok-4-1-fast-non-reasoning"),
    schema: TagSchema,
    system: systemPrompt,
    messages: [{ role: "user", content: contentParts }],
  });

  await sql`
    UPDATE saved_tweets
    SET tags = ${JSON.stringify(object.tags)}::jsonb,
        ai_title = ${object.title},
        ai_description = ${object.description}
    WHERE tweet_id = ${tweetId} AND user_id = ${userId}
  `;
}

// Ensure the user has a "Bookmarks" folder; return its id
export async function ensureBookmarksFolder(userId: string): Promise<string> {
  const rows = await sql`
    SELECT id FROM folders
    WHERE user_id = ${userId} AND name = 'Bookmarks'
    LIMIT 1
  `;
  if (rows.length > 0) return (rows[0] as any).id;

  const created = await sql`
    INSERT INTO folders (user_id, name)
    VALUES (${userId}, 'Bookmarks')
    RETURNING id
  `;
  return (created[0] as any).id;
}

// Run the full pipeline: fetch bookmarks → save → tag.
// Sequential to keep Grok rate-limit safe.
export async function importBookmarks(
  userId: string,
  options: { limit?: number; sinceTweetId?: string } = {}
): Promise<ImportResult> {
  const folderId = await ensureBookmarksFolder(userId);
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };

  const limit = options.limit ?? 20;
  let collected: BookmarkTweet[] = [];
  let nextToken: string | undefined;

  // Page until we have `limit` tweets or run out
  while (collected.length < limit) {
    const page = await fetchBookmarks(userId, {
      maxResults: Math.min(100, limit - collected.length),
      paginationToken: nextToken,
    });
    if (page.tweets.length === 0) break;

    for (const t of page.tweets) {
      // Stop if we hit a tweet we've already imported (autoimport mode)
      if (options.sinceTweetId && t.raw.id === options.sinceTweetId) {
        nextToken = undefined;
        break;
      }
      collected.push(t);
      if (collected.length >= limit) break;
    }
    if (!page.nextToken) break;
    nextToken = page.nextToken;
  }

  // Save + tag each, sequentially
  for (const t of collected) {
    try {
      const saveStatus = await saveTweet(userId, folderId, t);
      if (saveStatus === "skipped") {
        result.skipped += 1;
        continue;
      }
      result.imported += 1;
      try {
        await tagTweet(userId, t.raw.id);
      } catch (e: any) {
        // Tag failure is non-fatal — tweet is still saved
        console.error("[bookmarks-pipeline] tag failed:", t.raw.id, e?.message);
      }
    } catch (e: any) {
      result.failed += 1;
      result.errors.push(`${t.raw.id}: ${e?.message ?? "unknown"}`);
      console.error("[bookmarks-pipeline] save failed:", t.raw.id, e);
    }
  }

  // Update import state — record the newest imported tweet for autoimport
  if (collected.length > 0) {
    const newestId = collected[0].raw.id;
    await sql`
      INSERT INTO bookmark_import_state (user_id, last_imported_tweet_id, last_run_at, default_folder_id)
      VALUES (${userId}, ${newestId}, NOW(), ${folderId})
      ON CONFLICT (user_id) DO UPDATE SET
        last_imported_tweet_id = ${newestId},
        last_run_at = NOW(),
        default_folder_id = ${folderId}
    `;
  } else {
    await sql`
      INSERT INTO bookmark_import_state (user_id, last_run_at, default_folder_id)
      VALUES (${userId}, NOW(), ${folderId})
      ON CONFLICT (user_id) DO UPDATE SET
        last_run_at = NOW(),
        default_folder_id = ${folderId}
    `;
  }

  return result;
}
