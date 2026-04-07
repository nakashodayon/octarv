import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import type { ImagePart, TextPart } from "ai";
import { z } from "zod";

const sql = neon(process.env.DATABASE_URL!);

const TagSchema = z.object({
  title: z
    .string()
    .describe(
      "A concise, original title that captures the essence of the post in 5-12 words. Do NOT copy the post text verbatim — synthesize the core idea."
    ),
  description: z
    .string()
    .describe(
      "A meta-level summary (1-2 sentences) describing WHAT KIND of post this is and WHY it matters. Do NOT just paraphrase the post text. Write from an outside perspective. Use the same language as the post."
    ),
  tags: z
    .array(z.string())
    .describe(
      "Relevant tags for this post. Prefer reusing existing tags when they fit. Use lowercase, concise terms."
    ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tweetId } = await req.json();
    if (!tweetId) return NextResponse.json({ error: "Missing tweetId" }, { status: 400 });

    // Get the saved tweet data (any folder copy works — tweet_data is identical)
    const rows = await sql`
      SELECT tweet_data FROM saved_tweets
      WHERE tweet_id = ${tweetId} AND user_id = ${session.userId}
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Tweet not found" }, { status: 404 });

    const tweetData = rows[0].tweet_data as any;

    // Gather all existing tags from this user's tweets for reuse
    let existingTags: string[] = [];
    try {
      const tagRows = await sql`
        SELECT DISTINCT jsonb_array_elements_text(tags) AS tag
        FROM saved_tweets
        WHERE user_id = ${session.userId} AND tags IS NOT NULL AND jsonb_array_length(tags) > 0
      `;
      existingTags = tagRows.map((r: any) => r.tag as string);
    } catch (e) {
      console.warn("Could not gather existing tags:", e);
    }

    // Build message content — text + images
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
      "Analyze the post content carefully — text, images, and context.",
      "TITLE: 5-12 words. Original synthesis, NOT a copy of the post text.",
      "DESCRIPTION: 1-2 sentences from an OUTSIDE perspective explaining what kind of post this is and why it matters. Do NOT paraphrase or repeat the post content. Think 'Wikipedia summary' style.",
      "Use the SAME LANGUAGE as the original post for both title and description.",
      "TAGS: 3-8 concise lowercase tags. Prefer specific over generic. Include topic, domain, sentiment, format.",
    ]
      .filter(Boolean)
      .join(" ");

    const contentParts: (TextPart | ImagePart)[] = [
      {
        type: "text",
        text: `Post by @${authorHandle}:\n\n${tweetText}${mediaVideos.length > 0 ? "\n\n[This post contains video content]" : ""}`,
      },
      ...mediaImages.map((m: any) => ({
        type: "image" as const,
        image: (m.url ?? m.previewUrl) as string,
      })),
    ];

    console.log("[tag] generating tags for", tweetId, "with", mediaImages.length, "images");

    const { object } = await generateObject({
      model: xai("grok-4-1-fast-non-reasoning"),
      schema: TagSchema,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    });

    console.log("[tag] generated:", object);

    // Ensure columns exist
    await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS ai_title TEXT`;
    await sql`ALTER TABLE saved_tweets ADD COLUMN IF NOT EXISTS ai_description TEXT`;

    // Save AI metadata to DB
    await sql`
      UPDATE saved_tweets
      SET tags = ${JSON.stringify(object.tags)}::jsonb,
          ai_title = ${object.title},
          ai_description = ${object.description}
      WHERE tweet_id = ${tweetId} AND user_id = ${session.userId}
    `;

    return NextResponse.json({
      tags: object.tags,
      title: object.title,
      description: object.description,
    });
  } catch (e: any) {
    console.error("[tag] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: e?.stack },
      { status: 500 }
    );
  }
}
