"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { XTweetCard } from "@/components/ui/x-tweet-card";
import { LinkChip } from "@/components/ui/link-chip";
import { cn } from "@/lib/utils";

interface Run {
  id: string;
  project_id: string;
  status: string;
  markdown: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface Heading {
  id: string;
  text: string;
  depth: number;
}

// Remark plugin: turn ::tweet / ::tweetgroup directives into custom hast nodes.
function remarkTweetDirective() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        if (node.name === "tweet") {
          const id = node.attributes?.id;
          if (!id) return;
          const data = node.data || (node.data = {});
          data.hName = "tweet-embed";
          data.hProperties = { id };
        } else if (node.name === "tweetgroup") {
          const ids = node.attributes?.ids;
          if (!ids) return;
          const data = node.data || (node.data = {});
          data.hName = "tweet-group";
          data.hProperties = { ids };
        }
      }
    });
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<Run | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/research/runs/${runId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRun)
      .catch(() => {});
  }, [runId]);

  // Normalize tweet directives: turn `:::tweet{id=...}:::` (and stray variants)
  // into a leaf directive `::tweet{id=...}` on its own line so remark-directive parses it.
  // Then group consecutive tweet directives into a `::tweetgroup{ids=a,b,c}` carousel.
  const normalizedMarkdown = useMemo(() => {
    if (!run?.markdown) return "";
    let md = run.markdown
      .replace(/:::?tweet\{id=([^}]+)\}:*/g, "\n\n::tweet{id=$1}\n\n")
      .replace(/(?<!\n)\s*::tweet\{id=([^}]+)\}/g, "\n\n::tweet{id=$1}\n\n")
      // Bare numeric tweet ids on their own line (15-25 digits, optionally prefixed by "- " or "* ")
      .replace(/^\s*[-*]?\s*(\d{15,25})\s*$/gm, "\n\n::tweet{id=$1}\n\n");

    // Collapse consecutive tweet directives (separated only by blank lines) into a group
    const lines = md.split("\n");
    const out: string[] = [];
    let i = 0;
    const tweetRe = /^::tweet\{id=([^}]+)\}\s*$/;
    while (i < lines.length) {
      const m = tweetRe.exec(lines[i]);
      if (!m) {
        out.push(lines[i]);
        i++;
        continue;
      }
      const ids: string[] = [m[1]];
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].trim() === "") {
          j++;
          continue;
        }
        const m2 = tweetRe.exec(lines[j]);
        if (!m2) break;
        ids.push(m2[1]);
        j++;
      }
      if (ids.length === 1) {
        out.push(lines[i]);
        i++;
      } else {
        out.push("", `::tweetgroup{ids=${ids.join(",")}}`, "");
        i = j;
      }
    }
    return out.join("\n");
  }, [run?.markdown]);

  // Extract headings from markdown for the TOC
  const headings = useMemo<Heading[]>(() => {
    if (!normalizedMarkdown) return [];
    const lines = normalizedMarkdown.split("\n");
    const out: Heading[] = [];
    const seen = new Map<string, number>();
    for (const line of lines) {
      const m = /^(#{1,3})\s+(.*)$/.exec(line);
      if (!m) continue;
      const depth = m[1].length;
      const text = m[2].trim();
      let id = slugify(text);
      if (seen.has(id)) {
        const n = (seen.get(id) ?? 0) + 1;
        seen.set(id, n);
        id = `${id}-${n}`;
      } else {
        seen.set(id, 0);
      }
      out.push({ id, text, depth });
    }
    return out;
  }, [normalizedMarkdown]);

  // Scrollspy
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  // Map heading id assignment per render — use a counter ref pattern
  const headingCounterRef = useRef(0);
  const headingIdMapRef = useRef<Map<string, string>>(new Map());

  const headingComponent = (depth: number) =>
    function H({ children, ...props }: any) {
      const text = String(
        Array.isArray(children) ? children.join("") : children ?? ""
      );
      // Find matching id from headings list (in order)
      const heading = headings.find((h) => h.depth === depth && h.text === text);
      const id = heading?.id;
      const Tag = `h${depth}` as any;
      return (
        <Tag id={id} {...props} className={cn(
          "scroll-mt-24 font-bold",
          depth === 1 && "text-3xl mt-8 mb-4",
          depth === 2 && "text-2xl mt-8 mb-3",
          depth === 3 && "text-xl mt-6 mb-2"
        )}>
          {children}
        </Tag>
      );
    };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 bg-black rounded-full px-4 py-2 shadow-sm">
          <button
            onClick={() => router.push(`/agents/${projectId}`)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="text-sm font-bold">Back</span>
          </button>
          <span className="text-white/60">/</span>
          <span className="text-sm font-bold text-white">
            {run?.started_at ? new Date(run.started_at).toLocaleString() : "…"}
          </span>
        </div>
      </div>

      <div className="flex max-w-6xl mx-auto pt-24 px-6 pb-20 gap-12">
        {/* TOC sidebar (left) */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-56 shrink-0 sticky top-24 h-fit order-first">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Contents
            </p>
            <ul className="border-l border-border flex flex-col gap-1.5">
              {headings.map((h) => {
                const isActive = activeId === h.id;
                return (
                  <li
                    key={h.id}
                    style={{ paddingLeft: `${(h.depth - 1) * 12 + 12}px` }}
                  >
                    <a
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(h.id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className={cn(
                        "block text-sm transition-colors -ml-px border-l-2",
                        isActive
                          ? "text-foreground font-bold border-foreground"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      )}
                      style={{ paddingLeft: 8 }}
                    >
                      {h.text}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {/* Markdown body */}
        <div ref={contentRef} className="flex-1 min-w-0 max-w-3xl">
          {!run && <p className="text-sm text-muted-foreground">Loading…</p>}
          {run && run.status === "running" && (
            <p className="text-sm text-yellow-400">Still running...</p>
          )}
          {run && run.status === "failed" && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-sm font-bold text-red-400 mb-1">Failed</p>
              <p className="text-xs text-red-300/80">{run.error}</p>
            </div>
          )}
          {run?.markdown && (
            <article className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:my-3 prose-li:my-1 prose-a:text-blue-400 prose-strong:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkDirective, remarkTweetDirective]}
                components={{
                  h1: headingComponent(1),
                  h2: headingComponent(2),
                  h3: headingComponent(3),
                  a: ({ href, children }: any) => {
                    const url = String(href ?? "");
                    const isExternal = /^https?:\/\//.test(url);
                    if (!isExternal) {
                      return (
                        <a href={url} className="text-blue-400 hover:underline">
                          {children}
                        </a>
                      );
                    }
                    return <LinkChip url={url} />;
                  },
                  // @ts-expect-error custom element from remark plugin
                  "tweet-embed": ({ id }: { id?: string }) =>
                    id ? (
                      <div className="my-6 not-prose">
                        <XTweetCard id={id} preview className="w-full" />
                      </div>
                    ) : null,
                  "tweet-group": ({ ids }: { ids?: string }) => {
                    const list = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
                    if (list.length === 0) return null;
                    return (
                      <div className="my-6 not-prose">
                        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-2 px-2">
                          {list.map((id) => (
                            <div key={id} className="snap-center shrink-0 w-[85%] max-w-md">
                              <XTweetCard id={id} preview className="w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  },
                }}
              >
                {normalizedMarkdown}
              </ReactMarkdown>
            </article>
          )}
        </div>

      </div>
    </div>
  );
}
