"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LinkPreview } from "@/components/ui/link-preview";

interface TweetEntity {
  start: number;
  end: number;
  url?: string;
  expanded_url?: string;
  display_url?: string;
  username?: string;
  tag?: string;
}

interface TweetEntities {
  urls?: TweetEntity[];
  mentions?: TweetEntity[];
  hashtags?: TweetEntity[];
  cashtags?: TweetEntity[];
}

interface TweetData {
  id: string;
  text: string;
  entities?: TweetEntities;
  createdAt?: string;
  metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    impression_count: number;
  };
  author?: {
    name: string;
    username: string;
    profileImageUrl?: string;
    verified: boolean;
  };
  media?: Array<{
    type: string;
    url?: string;
    previewUrl?: string;
    width?: number;
    height?: number;
  }>;
  quoted?: TweetData | null;
  retweetedBy?: { name: string; username: string } | null;
}

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const VerifiedIcon = ({ className }: { className?: string }) => (
  <svg aria-label="Verified Account" viewBox="0 0 24 24" className={className}>
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

// Build segments from text + entities, then render with newlines and links
function TweetText({ text, entities }: { text: string; entities?: TweetEntities }) {
  // Collect all entity ranges
  type Segment =
    | { type: "text"; value: string }
    | { type: "url"; url: string; display: string }
    | { type: "mention"; username: string }
    | { type: "hashtag"; tag: string };

  const ranges: { start: number; end: number; segment: Segment }[] = [];

  for (const u of entities?.urls ?? []) {
    ranges.push({
      start: u.start,
      end: u.end,
      segment: {
        type: "url",
        url: u.expanded_url ?? u.url ?? "",
        display: u.display_url ?? u.expanded_url ?? u.url ?? "",
      },
    });
  }
  for (const m of entities?.mentions ?? []) {
    ranges.push({
      start: m.start,
      end: m.end,
      segment: { type: "mention", username: m.username ?? "" },
    });
  }
  for (const h of entities?.hashtags ?? []) {
    ranges.push({
      start: h.start,
      end: h.end,
      segment: { type: "hashtag", tag: h.tag ?? "" },
    });
  }

  // Sort by start position
  ranges.sort((a, b) => a.start - b.start);

  // Build final segment list
  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, segment } of ranges) {
    if (start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, start) });
    }
    segments.push(segment);
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  // Render: split text segments by \n into paragraphs
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const seg of segments) {
    if (seg.type === "text") {
      const lines = seg.value.split("\n");
      lines.forEach((line, i) => {
        if (i > 0) nodes.push(<br key={key++} />);
        if (line) nodes.push(<span key={key++}>{line}</span>);
      });
    } else if (seg.type === "url") {
      // Skip media URLs (pic.twitter.com / t.co that point to media)
      const isMediaUrl = seg.display.startsWith("pic.twitter.com") || seg.display.startsWith("pic.x.com");
      if (!isMediaUrl) {
        nodes.push(
          <a
            key={key++}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline break-all"
          >
            {seg.display}
          </a>
        );
      }
    } else if (seg.type === "mention") {
      nodes.push(
        <a
          key={key++}
          href={`https://x.com/${seg.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          @{seg.username}
        </a>
      );
    } else if (seg.type === "hashtag") {
      nodes.push(
        <a
          key={key++}
          href={`https://x.com/hashtag/${seg.tag}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          #{seg.tag}
        </a>
      );
    }
  }

  return (
    <div className="text-[15px] leading-relaxed text-foreground">
      {nodes}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function XTweetCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="animate-pulse size-10 rounded-full bg-muted" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="animate-pulse h-3 w-24 rounded bg-muted" />
          <div className="animate-pulse h-3 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="animate-pulse h-3 w-full rounded bg-muted" />
        <div className="animate-pulse h-3 w-5/6 rounded bg-muted" />
        <div className="animate-pulse h-3 w-4/6 rounded bg-muted" />
      </div>
    </div>
  );
}

function XTweetSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function QuotedTweet({ tweet }: { tweet: TweetData }) {
  return (
    <div className="rounded-xl border border-border/60 p-3 flex flex-col gap-2 bg-muted/30">
      <div className="flex items-center gap-2">
        {tweet.author?.profileImageUrl ? (
          <img
            src={tweet.author.profileImageUrl}
            alt={tweet.author.name}
            width={20}
            height={20}
            className="size-5 rounded-full object-cover"
          />
        ) : null}
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          {tweet.author?.name}
          {tweet.author?.verified && <VerifiedIcon className="size-3.5 text-blue-500" />}
        </span>
      </div>
      <div className="text-[14px] leading-relaxed text-foreground">
        <TweetText text={tweet.text} entities={tweet.entities} />
      </div>
      {tweet.media && tweet.media.length > 0 && (
        <div className="flex flex-col gap-2">
          {tweet.media.map((m, i) =>
            m.url || m.previewUrl ? (
              <img
                key={i}
                src={m.url ?? m.previewUrl}
                alt="Quoted media"
                className="rounded-lg border object-cover w-full"
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export function XTweetCard({
  id,
  className,
  preview = false,
}: {
  id: string;
  className?: string;
  preview?: boolean;
}) {
  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setTweet(null);

    fetch(`/api/tweet/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setTweet)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <XTweetSkeleton />;

  if (error || !tweet) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border p-6 text-muted-foreground text-sm", className)}>
        Tweet not found
      </div>
    );
  }

  const tweetUrl = `https://x.com/${tweet.author?.username}/status/${tweet.id}`;
  const formattedDate = tweet.createdAt
    ? new Date(tweet.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-5 w-full",
        className
      )}
    >
      {tweet.retweetedBy && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mb-1">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
          </svg>
          <span>{tweet.retweetedBy.name} がリポスト</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {tweet.author?.profileImageUrl ? (
            <img
              src={tweet.author.profileImageUrl}
              alt={tweet.author.name}
              width={48}
              height={48}
              className="size-12 rounded-full border border-border/50 object-cover"
            />
          ) : (
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
              {tweet.author?.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 font-medium text-foreground">
              {tweet.author?.name}
              {tweet.author?.verified && (
                <VerifiedIcon className="size-4 text-blue-500" />
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              @{tweet.author?.username}
            </span>
          </div>
        </div>
        <a href={tweetUrl} target="_blank" rel="noreferrer">
          <TwitterIcon className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
        </a>
      </div>

      {/* Text */}
      <TweetText
        text={preview && tweet.text.length > 280 ? tweet.text.slice(0, 280) + "…" : tweet.text}
        entities={preview ? undefined : tweet.entities}
      />

      {/* Media */}
      {(() => {
        const media = (tweet.media ?? []).filter((m) => m.url || m.previewUrl);
        if (media.length === 0) return null;
        if (media.length === 1) {
          const m = media[0];
          return (
            <img
              src={m.url ?? m.previewUrl}
              alt="Tweet media"
              className="rounded-xl border object-cover w-full"
            />
          );
        }
        return (
          <div className="relative flex transform-gpu snap-x snap-mandatory gap-2 overflow-x-auto">
            {media.map((m, i) => (
              <img
                key={i}
                src={m.url ?? m.previewUrl}
                alt="Tweet media"
                className="h-64 w-5/6 shrink-0 snap-center snap-always rounded-xl border object-cover"
              />
            ))}
          </div>
        );
      })()}

      {/* Article link preview — first non-media URL in the tweet */}
      {(() => {
        const urls = tweet.entities?.urls ?? [];
        const firstArticle = urls.find((u) => {
          const display = u.display_url ?? "";
          return (
            !display.startsWith("pic.twitter.com") &&
            !display.startsWith("pic.x.com") &&
            !!u.expanded_url
          );
        });
        if (!firstArticle?.expanded_url) return null;
        // Skip if the link points to another tweet (already shown as quoted)
        if (/x\.com\/\w+\/status\/\d+/.test(firstArticle.expanded_url)) return null;
        return <LinkPreview url={firstArticle.expanded_url} />;
      })()}

      {/* Quoted tweet */}
      {tweet.quoted && <QuotedTweet tweet={tweet.quoted} />}

      {/* Date + metrics */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        {formattedDate && (
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        )}
        {tweet.metrics && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{tweet.metrics.reply_count.toLocaleString()} replies</span>
            <span>{tweet.metrics.retweet_count.toLocaleString()} RTs</span>
            <span>{tweet.metrics.like_count.toLocaleString()} likes</span>
          </div>
        )}
      </div>
    </div>
  );
}
