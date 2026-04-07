import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  buildAuthorizeUrl,
  codeChallengeFromVerifier,
  generateCodeVerifier,
  generateState,
} from "@/lib/x-oauth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const verifier = generateCodeVerifier();
  const state = generateState();
  const challenge = codeChallengeFromVerifier(verifier);

  const cookieStore = await cookies();
  cookieStore.set("x_oauth_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("x_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = buildAuthorizeUrl(state, challenge);
  return NextResponse.redirect(url);
}
