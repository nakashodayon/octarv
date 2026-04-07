import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { importBookmarks } from "@/lib/bookmarks-pipeline";

export const maxDuration = 300; // up to 5 min for the initial 20-tweet pass

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const limit = Math.min(50, Math.max(1, body.limit ?? 20));

  try {
    const result = await importBookmarks(session.userId, { limit });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[bookmarks/import] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
