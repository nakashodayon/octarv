"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomMenu from "@/components/bottom-menu";
import FolderInteraction from "@/components/folder-interaction";
import { SubSelectToggle } from "@/components/ui/sub-select-toggle";
import { ProjectCreatePopup } from "@/components/project-create-popup";

interface Project {
  id: string;
  name: string;
  prompt: string;
  tag_hints: string[];
  target_folder_ids: string[];
  schedule_hour: number;
  enabled: boolean;
}

export default function AgentsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  const reload = () => {
    fetch("/api/research/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Project[]) => setProjects(rows))
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/research/projects?id=${id}`, { method: "DELETE" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top-right mode toggle */}
      <div className="fixed top-6 right-6 z-50">
        <SubSelectToggle
          options={[
            { label: "Dashboard", value: "dashboard" },
            { label: "Workflow", value: "agents" },
          ]}
          value="agents"
          onChange={(v) => {
            if (v === "dashboard") router.push("/dashboard");
          }}
        />
      </div>

      {/* Projects */}
      <div className="fixed top-16 left-0 right-0 flex justify-center">
        <div className="flex items-end gap-6">
          {loaded &&
            projects.map((project) => (
              <div
                key={project.id}
                className="relative group cursor-pointer"
                onClick={() => router.push(`/agents/${project.id}`)}
              >
                <FolderInteraction
                  title={project.name}
                  folderId={project.id}
                  disableNavigation
                />
                <button
                  onClick={() => handleDelete(project.id)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-black/80 hover:bg-red-500/80 text-white z-10"
                  aria-label={`Delete ${project.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setCreating(true)}
              className="w-40 h-28 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white/70 transition-colors"
              aria-label="Create new project"
            >
              <Plus className="size-8" />
            </button>
            <span className="text-sm text-muted-foreground">Add</span>
          </div>

          {/* Invisible spacers so Add sits at dashboard's leftmost folder position */}
          {loaded && projects.length === 0 && (
            <>
              <div className="w-40 h-28 invisible" aria-hidden />
              <div className="w-40 h-28 invisible" aria-hidden />
            </>
          )}
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <BottomMenu />
      </div>

      {creating && (
        <ProjectCreatePopup
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
