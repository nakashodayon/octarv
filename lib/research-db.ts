import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

let ensured = false;

export async function ensureResearchTables() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS research_projects (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      tag_hints JSONB DEFAULT '[]'::jsonb,
      target_folder_ids JSONB DEFAULT '[]'::jsonb,
      schedule_hour INT NOT NULL DEFAULT 9,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS min_likes INT DEFAULT 0`;
  await sql`ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS min_retweets INT DEFAULT 0`;
  await sql`ALTER TABLE research_projects ADD COLUMN IF NOT EXISTS min_replies INT DEFAULT 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS research_runs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      markdown TEXT,
      error TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS research_runs_project_idx ON research_runs (project_id, started_at DESC)`;
  ensured = true;
}

export { sql as researchSql };
