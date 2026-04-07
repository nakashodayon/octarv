"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Settings } from "lucide-react";
import { sileo, Toaster } from "sileo";
import { ProjectCreatePopup } from "@/components/project-create-popup";

interface Project {
  id: string;
  name: string;
  prompt: string;
  tag_hints: string[];
  target_folder_ids: string[];
  schedule_hour: number;
  enabled: boolean;
  min_likes?: number;
  min_retweets?: number;
  min_replies?: number;
}

interface Run {
  id: string;
  project_id: string;
  status: "running" | "completed" | "failed";
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);

  const reloadProject = () => {
    fetch("/api/research/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Project[]) => {
        const p = rows.find((x) => x.id === projectId);
        if (p) setProject(p);
      });
  };

  const runsRef = useRef<Run[]>([]);
  runsRef.current = runs;

  const notify = (title: string, body: string) => {
    sileo.success({ title, description: body, duration: 4000 });
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body });
      } catch {}
    }
  };

  const reloadRuns = async () => {
    const res = await fetch(`/api/research/runs?projectId=${projectId}`);
    if (!res.ok) return;
    const next: Run[] = await res.json();

    // Diff against previous snapshot to detect newly-finished runs
    const prevById = new Map(runsRef.current.map((r) => [r.id, r.status]));
    for (const r of next) {
      const prevStatus = prevById.get(r.id);
      if (prevStatus && prevStatus !== r.status) {
        if (r.status === "completed") {
          notify("リサーチ完了", `${project?.name ?? "Project"} のレポートが届きました`);
        } else if (r.status === "failed") {
          notify("リサーチ失敗", r.error ?? "unknown error");
        }
      }
    }
    setRuns(next);
  };

  useEffect(() => {
    fetch("/api/research/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Project[]) => {
        const p = rows.find((x) => x.id === projectId);
        if (p) setProject(p);
      });
    reloadRuns();

    // Ask for browser notification permission once
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Poll while any run is still running
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");
    if (!hasRunning) return;
    const t = setInterval(() => {
      reloadRuns();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  const handleRunNow = async () => {
    setRunning(true);
    const p = fetch("/api/research/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });

    sileo.promise(p, {
      loading: { title: "リサーチ開始中" },
      success: { title: "実行を開始しました", duration: 2000 },
      error: { title: "起動に失敗", duration: 3000 },
    });

    try {
      await p;
      // Poll a couple of times to surface the running status
      setTimeout(reloadRuns, 800);
      setTimeout(reloadRuns, 4000);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="bottom-right" />
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 bg-black rounded-full px-4 py-2 shadow-sm">
          <button
            onClick={() => router.push("/agents")}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="text-sm font-bold">Agents</span>
          </button>
          <span className="text-white/60">/</span>
          <span className="text-sm font-bold text-white">{project?.name ?? "…"}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunNow}
            disabled={running}
            className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Play className="size-3.5" />
            Run now
          </button>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 size-10 transition-colors"
            aria-label="Edit project"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {editing && project && (
        <ProjectCreatePopup
          existing={project}
          onClose={() => setEditing(false)}
          onCreated={() => {
            setEditing(false);
            reloadProject();
          }}
        />
      )}

      <div className="max-w-3xl mx-auto pt-28 px-6 pb-20">
        {project && (
          <div className="mb-8 p-5 rounded-2xl border border-border bg-muted/20">
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {project.prompt}
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>Daily {project.schedule_hour.toString().padStart(2, "0")}:00</span>
              <span>•</span>
              <span>{project.target_folder_ids.length} folder(s)</span>
              <span>•</span>
              <span>{project.tag_hints.length} tag hint(s)</span>
            </div>
          </div>
        )}

        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
          History
        </h2>
        <div className="flex flex-col gap-2">
          {runs.length === 0 && (
            <p className="text-sm text-muted-foreground">No runs yet. Click "Run now" to start.</p>
          )}
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => router.push(`/agents/${projectId}/runs/${run.id}`)}
              className="text-left p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {new Date(run.started_at).toLocaleString()}
                </span>
                <span
                  className={
                    "text-xs px-2 py-0.5 rounded-full font-bold " +
                    (run.status === "completed"
                      ? "bg-green-500/15 text-green-400"
                      : run.status === "failed"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-yellow-500/15 text-yellow-400")
                  }
                >
                  {run.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
