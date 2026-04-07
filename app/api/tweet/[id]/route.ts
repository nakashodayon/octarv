import { NextRequest, NextResponse } from "next/server";
import { buildXUrl, normalizeXResponse } from "@/lib/x";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = buildXUrl(id);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("X API error:", res.status, err);
      return NextResponse.json({ error: "Failed to fetch tweet" }, { status: res.status });
    }

    const json = await res.json();
    const normalized = normalizeXResponse(json);
    if (!normalized) {
      return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
    }

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("X API fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
