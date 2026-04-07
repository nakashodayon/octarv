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

export function LinkPreview({ url, className }: { url: string; className?: string }) {
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
        if (d && (d.title || d.description || d.image)) {
          cache.set(url, d);
          setData(d);
        } else {
          cache.set(url, null);
          setData(null);
        }
      })
      .catch(() => {
        cache.set(url, null);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 overflow-hidden animate-pulse bg-muted/30 h-40",
          className
        )}
      />
    );
  }

  if (!data?.image) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-xl border border-border/60 overflow-hidden hover:opacity-90 transition-opacity",
        className
      )}
    >
      <img
        src={data.image}
        alt={data.title ?? ""}
        className="w-full h-auto object-cover"
      />
    </a>
  );
}
