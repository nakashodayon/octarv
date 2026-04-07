import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  exchangeCodeForToken,
  fetchXUserMe,
  saveTokens,
} from "@/lib/x-oauth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error)}`, req.url)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding?error=missing_params", req.url));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("x_oauth_state")?.value;
  const verifier = cookieStore.get("x_oauth_verifier")?.value;

  if (!storedState || !verifier || storedState !== state) {
    return NextResponse.redirect(new URL("/onboarding?error=state_mismatch", req.url));
  }

  try {
    const tokenRes = await exchangeCodeForToken(code, verifier);
    const me = await fetchXUserMe(tokenRes.access_token);
    await saveTokens(session.userId, {
      access_token: tokenRes.access_token,
      refresh_token: tokenRes.refresh_token,
      expires_in: tokenRes.expires_in,
      scope: tokenRes.scope,
      x_user_id: me.id,
      x_username: me.username,
    });

    // Clean up cookies
    cookieStore.delete("x_oauth_state");
    cookieStore.delete("x_oauth_verifier");

    return NextResponse.redirect(new URL("/onboarding?step=import", req.url));
  } catch (e: any) {
    console.error("[x-oauth] callback error:", e);
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(e?.message ?? "unknown")}`, req.url)
    );
  }
}
