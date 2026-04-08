// Helpers for normalizing X API v2 responses into our tweet shape.

export const TWEET_FIELDS = [
  "text",
  "created_at",
  "public_metrics",
  "note_tweet",
  "entities",
  "referenced_tweets",
  "author_id",
  "attachments",
].join(",");

export const USER_FIELDS = [
  "name",
  "username",
  "profile_image_url",
  "verified",
].join(",");

export const MEDIA_FIELDS = [
  "url",
  "preview_image_url",
  "type",
  "width",
  "height",
].join(",");

export const EXPANSIONS = [
  "author_id",
  "attachments.media_keys",
  "referenced_tweets.id",
  "referenced_tweets.id.author_id",
  "referenced_tweets.id.attachments.media_keys",
].join(",");

export function buildXUrl(tweetId: string) {
  const url = new URL(`https://api.twitter.com/2/tweets/${tweetId}`);
  url.searchParams.set("tweet.fields", TWEET_FIELDS);
  url.searchParams.set("user.fields", USER_FIELDS);
  url.searchParams.set("media.fields", MEDIA_FIELDS);
  url.searchParams.set("expansions", EXPANSIONS);
  return url;
}

type Includes = {
  users?: any[];
  media?: any[];
  tweets?: any[];
};

function normalizeTweet(data: any, includes: Includes): any {
  // If this is a retweet, hydrate AS the original tweet and remember who retweeted.
  const retweetRef = (data.referenced_tweets ?? []).find(
    (r: any) => r.type === "retweeted"
  );
  if (retweetRef) {
    const originalData = includes.tweets?.find((t) => t.id === retweetRef.id);
    const retweeter = includes.users?.find((u) => u.id === data.author_id) ?? null;
    if (originalData) {
      const original = normalizeTweet(originalData, includes);
      return {
        ...original,
        retweetedBy: retweeter
          ? {
              name: retweeter.name,
              username: retweeter.username,
            }
          : null,
      };
    }
    // Original not in includes — still use the original tweet's ID so
    // deduplication works when the original is also saved separately.
    const fallback = normalizeTweet({ ...data, referenced_tweets: undefined }, includes);
    return {
      ...fallback,
      id: retweetRef.id,
      retweetedBy: retweeter
        ? { name: retweeter.name, username: retweeter.username }
        : null,
    };
  }

  const author = includes.users?.find((u) => u.id === data.author_id) ?? null;

  const mediaKeys: string[] = data.attachments?.media_keys ?? [];
  const media =
    mediaKeys
      .map((k) => includes.media?.find((m) => m.media_key === k))
      .filter(Boolean)
      .map((m: any) => ({
        type: m.type,
        url: m.url,
        previewUrl: m.preview_image_url,
        width: m.width,
        height: m.height,
      })) ?? [];

  // note_tweet contains full text for X Premium long-form posts
  const fullText: string = data.note_tweet?.text ?? data.text;
  const entities = data.note_tweet?.entities ?? data.entities ?? {};

  // Find quoted tweet (referenced_tweets with type "quoted")
  const quotedRef = (data.referenced_tweets ?? []).find(
    (r: any) => r.type === "quoted"
  );
  let quoted: any = null;
  if (quotedRef) {
    const quotedData = includes.tweets?.find((t) => t.id === quotedRef.id);
    if (quotedData) {
      // Recursively normalize (without further nesting to avoid infinite quotes)
      quoted = normalizeTweet(quotedData, includes);
    }
  }

  return {
    id: data.id,
    text: fullText,
    entities,
    createdAt: data.created_at,
    metrics: data.public_metrics,
    author: author
      ? {
          id: author.id,
          name: author.name,
          username: author.username,
          profileImageUrl: author.profile_image_url,
          verified: author.verified ?? false,
        }
      : null,
    media,
    quoted,
  };
}

export function normalizeXResponse(json: any) {
  const data = json.data;
  if (!data) return null;
  const includes: Includes = json.includes ?? {};
  return normalizeTweet(data, includes);
}
