import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const sql = neon(process.env.DATABASE_URL!);

const X_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export const X_OAUTH_SCOPES = [
  "tweet.read",
  "users.read",
  "bookmark.read",
  "offline.access",
].join(" ");

export interface XTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  x_user_id: string;
  x_username: string | null;
}

export async function ensureXOauthTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS x_oauth_tokens (
      user_id TEXT PRIMARY KEY,
      x_user_id TEXT NOT NULL,
      x_username TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      scopes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bookmark_import_state (
      user_id TEXT PRIMARY KEY,
      last_imported_tweet_id TEXT,
      last_run_at TIMESTAMPTZ,
      default_folder_id TEXT,
      enabled BOOLEAN DEFAULT true
    )
  `;
}

// PKCE helpers
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function codeChallengeFromVerifier(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.X_OAUTH_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.X_OAUTH_REDIRECT_URI!);
  url.searchParams.set("scope", X_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function basicAuthHeader(): string {
  const id = process.env.X_OAUTH_CLIENT_ID!;
  const secret = process.env.X_OAUTH_CLIENT_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: process.env.X_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.X_OAUTH_REDIRECT_URI!,
    code_verifier: codeVerifier,
  });

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
}

export async function refreshToken(refresh_token: string) {
  const body = new URLSearchParams({
    refresh_token,
    grant_type: "refresh_token",
    client_id: process.env.X_OAUTH_CLIENT_ID!,
  });

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export async function fetchXUserMe(access_token: string) {
  const res = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) {
    throw new Error(`/users/me failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data as { id: string; username: string; name: string };
}

export async function saveTokens(
  userId: string,
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
    x_user_id: string;
    x_username: string | null;
  }
) {
  await ensureXOauthTable();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await sql`
    INSERT INTO x_oauth_tokens (user_id, x_user_id, x_username, access_token, refresh_token, expires_at, scopes, updated_at)
    VALUES (${userId}, ${data.x_user_id}, ${data.x_username}, ${data.access_token}, ${data.refresh_token}, ${expiresAt.toISOString()}, ${data.scope ?? null}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      x_user_id = EXCLUDED.x_user_id,
      x_username = EXCLUDED.x_username,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      scopes = EXCLUDED.scopes,
      updated_at = NOW()
  `;
}

export async function getValidTokens(userId: string): Promise<XTokens | null> {
  await ensureXOauthTable();
  const rows = await sql`
    SELECT * FROM x_oauth_tokens WHERE user_id = ${userId}
  `;
  if (rows.length === 0) return null;

  let row = rows[0] as any;
  const expiresAt = new Date(row.expires_at);
  // Refresh if expiring within 5 minutes
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshToken(row.refresh_token);
    await saveTokens(userId, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_in: refreshed.expires_in,
      x_user_id: row.x_user_id,
      x_username: row.x_username,
    });
    row = {
      ...row,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    };
  }

  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: new Date(row.expires_at),
    x_user_id: row.x_user_id,
    x_username: row.x_username,
  };
}

export async function deleteXTokens(userId: string) {
  await ensureXOauthTable();
  await sql`DELETE FROM x_oauth_tokens WHERE user_id = ${userId}`;
}
