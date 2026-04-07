# Octarv

A personal knowledge base for X (Twitter) bookmarks, with AI agents that research topics and curate findings into your folders every day.

## What it does

- **Bookmarks pipeline** — connects your X account, imports bookmarks, auto-tags them with Grok, and organizes them into folders.
- **Tag-based folder filters** — define `match_tags` on a folder and any tweet whose tags overlap shows up there automatically.
- **Research agents** — create projects with a topic, target folders, and an engagement filter. Agents run daily (or on demand), search X with Grok, and write a Markdown report with embedded tweet cards.
- **Rich report viewer** — left-side scrollspy TOC, tweet embeds, link chips with og previews, and carousel grouping for consecutive posts.

## Stack

- Next.js 16 (App Router, Turbopack)
- Bun (package manager and runtime)
- Neon Postgres
- Vercel AI SDK + `@ai-sdk/xai` (Grok responses API + xSearch / webSearch tools)
- shadcn/ui + Tailwind + framer-motion
- react-tweet for X embeds

## Local development

```bash
bun install
bun run dev
```

Open http://localhost:3000.

### Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `XAI_API_KEY` | Grok / xSearch / webSearch |
| `X_BEARER_TOKEN` | App-level X API v2 (tweet fetch) |
| `X_OAUTH_CLIENT_ID` | X OAuth (user bookmarks import) |
| `X_OAUTH_CLIENT_SECRET` | Same |
| `X_OAUTH_REDIRECT_URI` | `<base-url>/api/auth/x/callback` |
| `CRON_SECRET` | Auth for `/api/cron/*` endpoints |

### Useful commands

```bash
bun run dev         # start dev server (Turbopack)
bun run build       # production build
bun run typecheck   # tsc --noEmit
bun run lint        # eslint
bun run format      # prettier
```

## Project layout

```
app/
  agents/           # research agents page + project detail + run report viewer
  api/
    auth/x/         # X OAuth connect + callback
    bookmarks/      # bookmarks import + status
    cron/           # vercel cron handlers
    folders/        # folders CRUD with match_tags
    research/       # research projects, runs, run trigger
    tweets/         # saved tweets CRUD + tag generation
  dashboard/        # folders list + folder detail (gallery)
  onboarding/       # connect-X-account flow
lib/
  bookmarks-pipeline.ts   # fetch -> save -> AI tag
  research-agent.ts       # Experimental_Agent + xai.responses + tools
  research-tools.ts       # content_search, content_create
  x.ts                    # X API normalize (handles retweets + quoted)
  x-oauth.ts              # X OAuth tokens
components/
  ui/                     # shadcn-style components
```

## Conventions

- **Bun only.** No npm/yarn/pnpm.
- **shadcn/ui first.** Add components via the `shadcn` CLI when possible.
- **`components/`** holds all reusable UI. Don't drop generic components in `app/`.
- See `CLAUDE.md` for the full development rules used by AI assistants.

## Deploy

This is a Vercel project. Push to `main` and Vercel rebuilds. Environment variables must be set in the Vercel dashboard before the first deploy.

For OAuth, the X Developer Portal callback list must include the production URL: `https://<your-domain>/api/auth/x/callback`.
