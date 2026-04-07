import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { xai, xaiTools } from "@ai-sdk/xai";
import { neon } from "@neondatabase/serverless";
import { ensureResearchTables, researchSql } from "@/lib/research-db";
import { makeContentSearchTool, makeContentCreateTool } from "@/lib/research-tools";

const sql = neon(process.env.DATABASE_URL!);

interface ResearchProject {
  id: string;
  name: string;
  prompt: string;
  tag_hints: string[];
  target_folder_ids: string[];
  min_likes?: number;
  min_retweets?: number;
  min_replies?: number;
}

interface FolderInfo {
  id: string;
  name: string;
  match_tags: string[];
}

async function loadProject(userId: string, projectId: string): Promise<ResearchProject | null> {
  const rows = await sql`
    SELECT id, name, prompt, tag_hints, target_folder_ids, min_likes, min_retweets, min_replies
    FROM research_projects
    WHERE id = ${projectId} AND user_id = ${userId}
    LIMIT 1
  `;
  return (rows[0] as any) ?? null;
}

async function loadFolders(userId: string, ids: string[]): Promise<FolderInfo[]> {
  if (ids.length === 0) return [];
  const rows = await sql`
    SELECT id, name, match_tags
    FROM folders
    WHERE user_id = ${userId} AND id = ANY(${ids as any})
  `;
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    match_tags: r.match_tags ?? [],
  }));
}

function buildSystemPrompt(project: ResearchProject, folders: FolderInfo[]) {
  const folderLines = folders
    .map(
      (f) =>
        `- id=${f.id} name="${f.name}" tags=[${(f.match_tags ?? []).join(", ")}]`
    )
    .join("\n");

  return [
    "You are a daily research agent for a personal knowledge base.",
    "Your job: investigate the user's research topic using X (Twitter) search and the user's existing knowledge base, then write a concise daily report in Markdown.",
    "",
    `# Research topic`,
    project.prompt,
    "",
    project.tag_hints.length > 0
      ? `# Related tags the user cares about\n${project.tag_hints.join(", ")}`
      : "",
    "",
    (() => {
      const filters: string[] = [];
      if ((project.min_likes ?? 0) > 0) filters.push(`likes >= ${project.min_likes}`);
      if ((project.min_retweets ?? 0) > 0) filters.push(`retweets >= ${project.min_retweets}`);
      if ((project.min_replies ?? 0) > 0) filters.push(`replies >= ${project.min_replies}`);
      return filters.length > 0
        ? `# Engagement filter\nOnly include X posts whose engagement meets ALL of these thresholds: ${filters.join(", ")}. When x_search returns posts, check the likes count and skip any that don't qualify. Do NOT call content_create on posts that fail this filter.`
        : "";
    })(),
    "",
    "# Available destination folders",
    "When you find a noteworthy NEW X post, call the content_create tool with the folderId that best matches the post's theme. Allowed folders:",
    folderLines || "(none — do not call content_create)",
    "",
    "# Tools",
    "- x_search: search live X (Twitter) posts. Use this to find fresh discussions on the topic.",
    "- web_search: search the open web for articles and announcements.",
    "- content_search: search the user's existing saved tweets to avoid duplicates and to ground your report in what they already know.",
    "- content_create: save a freshly discovered X post into one of the allowed folders. Always pass the numeric tweet id (extracted from the X post url like x.com/<user>/status/<id>).",
    "",
    "# Output format",
    "Write a Markdown report with:",
    "1. A short executive summary (2-3 sentences).",
    "2. 3-6 H2 sections covering the key findings of the day.",
    "3. Inside any section, embed relevant X posts using the directive: `::tweet{id=TWEET_ID}` on its own line (TWO colons, no closing). Use this for posts you saved with content_create AND for notable existing posts surfaced via content_search.",
    "IMPORTANT: Whenever you reference an X post in the prose, you MUST place its `::tweet{id=...}` directive on its own line directly BELOW the paragraph that mentions it. Never leave an X post mentioned in the text without an embed directive below. If multiple X posts back the same paragraph, list multiple `::tweet{id=...}` lines consecutively (they will render as a carousel).",
    "4. End with a 'Sources' H2 listing the most important tweets — each as its own `::tweet{id=TWEET_ID}` directive line. Do NOT print bare numeric ids; always use the directive form so they render as cards.",
    "Use the same language as the research topic. Keep it scannable.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runResearch(userId: string, projectId: string, runId: string) {
  await ensureResearchTables();
  const project = await loadProject(userId, projectId);
  if (!project) throw new Error("Project not found");

  const folders = await loadFolders(userId, project.target_folder_ids ?? []);
  const allowedFolderIds = folders.map((f) => f.id);

  const agent = new Agent({
    model: xai.responses("grok-4-1-fast-reasoning"),
    instructions: buildSystemPrompt(project, folders),
    tools: {
      x_search: xaiTools.xSearch(),
      web_search: xaiTools.webSearch(),
      content_search: makeContentSearchTool(userId),
      content_create: makeContentCreateTool(userId, allowedFolderIds),
    },
    stopWhen: stepCountIs(12),
  });

  try {
    const result = await agent.generate({
      prompt: `Run today's research for project "${project.name}". Use your tools, then write the Markdown report.`,
    });

    const markdown = result.text ?? "";
    await researchSql`
      UPDATE research_runs
      SET status = 'completed', markdown = ${markdown}, finished_at = NOW()
      WHERE id = ${runId} AND user_id = ${userId}
    `;
  } catch (e: any) {
    console.error("[research-agent] failed:", e);
    await researchSql`
      UPDATE research_runs
      SET status = 'failed', error = ${e?.message ?? "unknown"}, finished_at = NOW()
      WHERE id = ${runId} AND user_id = ${userId}
    `;
    throw e;
  }
}
