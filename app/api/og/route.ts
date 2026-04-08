import { NextRequest, NextResponse } from "next/server";

// Naive OG metadata fetcher. Returns title, description, image, siteName.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OctarvBot/1.0; +https://octarv.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Cache aggressively — OG metadata rarely changes
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Fetch failed" },
        { status: res.status, headers: { "Cache-Control": "public, s-maxage=3600" } }
      );
    }

    const html = await res.text();
    // Only look at <head> for perf
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[1] : html.slice(0, 50000);

    const meta = (property: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const m = head.match(re);
      if (m) return m[1];
      // Try with content first
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
        "i"
      );
      const m2 = head.match(re2);
      return m2 ? m2[1] : null;
    };

    const titleTag = head.match(/<title[^>]*>([^<]+)<\/title>/i);

    const title =
      meta("og:title") ?? meta("twitter:title") ?? (titleTag ? titleTag[1] : null);
    const description =
      meta("og:description") ?? meta("twitter:description") ?? meta("description");
    const image = meta("og:image") ?? meta("twitter:image");
    const siteName = meta("og:site_name");

    let resolvedImage: string | null = image;
    if (image && !image.startsWith("http")) {
      try {
        resolvedImage = new URL(image, url).toString();
      } catch {}
    }

    return NextResponse.json(
      {
        url,
        title: title?.trim() ?? null,
        description: description?.trim() ?? null,
        image: resolvedImage,
        siteName: siteName?.trim() ?? null,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
