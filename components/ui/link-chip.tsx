"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface OgData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const cache = new Map<string, OgData | null>();

function truncate(s: string, n = 5) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function hostname(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

export function LinkChip({ url, className }: { url: string; className?: string }) {
  const [data, setData] = useState<OgData | null | undefined>(() => cache.get(url));
  const [loading, setLoading] = useState(!cache.has(url));

  useEffect(() => {
    if (cache.has(url)) {
      setData(cache.get(url));
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OgData | null) => {
        cache.set(url, d ?? null);
        setData(d ?? null);
      })
      .catch(() => {
        cache.set(url, null);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [url]);

  const host = hostname(url);
  const isX = host === "x.com" || host === "twitter.com" || host === "t.co";
  const favicon = isX
    ? "https://abs.twimg.com/favicons/twitter.3.ico"
    : data?.image ?? `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  const label = truncate(data?.title ?? data?.siteName ?? host);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 align-middle rounded-full bg-muted hover:bg-muted/80 border border-border px-2 py-0.5 text-[13px] font-medium text-foreground no-underline transition-colors max-w-xs",
        className
      )}
    >
      {!loading && (
        <img
          src={favicon}
          alt=""
          className="size-4 rounded-sm object-cover shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
          }}
        />
      )}
      <span className="truncate">{loading ? host : label}</span>
    </a>
  );
}
