import { tool } from "ai";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { buildXUrl, normalizeXResponse } from "@/lib/x";

const sql = neon(process.env.DATABASE_URL!);

export function makeContentSearchTool(userId: string) {
  return tool({
    description:
      "Search the user's saved tweet knowledge base. Returns matching tweets with id, text, author handle and tags. Use this before recommending content the user already has.",
    inputSchema: z.object({
      query: z.string().describe("Free-text query matched against tweet text."),
      tags: z.array(z.string()).optional().describe("Optional tag filter; matches tweets with any of these tags."),
      limit: z.number().int().min(1).max(50).optional().default(10),
    }),
    execute: async ({ query, tags, limit = 10 }) => {
      const like = `%${query}%`;
      const useTags = Array.isArray(tags) && tags.length > 0;
      const rows = useTags
        ? await sql`
            SELECT tweet_id, tweet_data, tags
            FROM saved_tweets
            WHERE user_id = ${userId}
              AND (tweet_data->>'text' ILIKE ${like} OR tags ?| ${tags as any})
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT tweet_id, tweet_data, tags
            FROM saved_tweets
            WHERE user_id = ${userId}
              AND tweet_data->>'text' ILIKE ${like}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
      return rows.map((r: any) => ({
        tweetId: r.tweet_id,
        text: r.tweet_data?.text ?? "",
        author: r.tweet_data?.author?.username ?? "",
        tags: r.tags ?? [],
      }));
    },
  });
}

export function makeContentCreateTool(userId: string, allowedFolderIds: string[]) {
  const allowed = new Set(allowedFolderIds);
  return tool({
    description:
      "Save a newly discovered X (Twitter) post into one of the user's folders. Use this to add fresh research findings to the user's knowledge base. Choose the folder whose theme best matches the post.",
    inputSchema: z.object({
      tweetId: z.string().describe("The X status id (numeric string)."),
      folderId: z.string().describe("The destination folder id. Must be one of the allowed folder ids."),
    }),
    execute: async ({ tweetId, folderId }) => {
      if (!allowed.has(folderId)) {
        return { ok: false, error: `folderId ${folderId} not in allowed list` };
      }

      // Already saved here?
      const existing = await sql`
        SELECT id FROM saved_tweets
        WHERE user_id = ${userId} AND tweet_id = ${tweetId} AND folder_id = ${folderId}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return { ok: true, status: "already_saved", tweetId, folderId };
      }

      // Fetch from X
      const res = await fetch(buildXUrl(tweetId).toString(), {
        headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
      });
      if (!res.ok) {
        return { ok: false, error: `X fetch failed: ${res.status}` };
      }
      const json = await res.json();
      const normalized = normalizeXResponse(json);
      if (!normalized) return { ok: false, error: "Tweet not found" };

      await sql`
        INSERT INTO saved_tweets (user_id, tweet_id, tweet_data, tags, folder_id)
        VALUES (${userId}, ${tweetId}, ${JSON.stringify(normalized)}, NULL, ${folderId})
        ON CONFLICT (user_id, tweet_id, folder_id) DO NOTHING
      `;
      return { ok: true, status: "saved", tweetId, folderId };
    },
  });
}
