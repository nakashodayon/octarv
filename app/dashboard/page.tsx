"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomMenu from "@/components/bottom-menu";
import FolderInteraction from "@/components/folder-interaction";
import { SubSelectToggle } from "@/components/ui/sub-select-toggle";

interface Folder {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Folder[]) => setFolders(rows))
      .finally(() => setLoaded(true));
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
    }
    setNewName("");
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/folders?id=${id}`, { method: "DELETE" });
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
          value="dashboard"
          onChange={(v) => {
            if (v === "agents") router.push("/agents");
          }}
        />
      </div>

      {/* Folders */}
      <div className="fixed top-16 left-0 right-0 flex justify-center">
        <div className="flex items-end gap-6">
          {/* Always-present "All" virtual folder */}
          <FolderInteraction title="All" folderId="all" />

          {/* User folders */}
          {loaded &&
            folders.map((folder) => (
              <div key={folder.id} className="relative group">
                <FolderInteraction title={folder.name} folderId={folder.id} />
                <button
                  onClick={() => handleDelete(folder.id)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-black/80 hover:bg-red-500/80 text-white z-10"
                  aria-label={`Delete ${folder.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

          {/* Create-new folder: shows real folder with editable title input */}
          {creating ? (
            <FolderInteraction
              disableNavigation
              titleSlot={
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  placeholder="Folder name"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  onBlur={handleCreate}
                  className="bg-transparent text-sm text-center text-foreground outline-none placeholder:text-muted-foreground/50 w-32"
                />
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setCreating(true)}
                className="w-40 h-28 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white/70 transition-colors"
                aria-label="Create new folder"
              >
                <Plus className="size-8" />
              </button>
              <span className="text-sm text-muted-foreground">Add</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <BottomMenu />
      </div>
    </div>
  );
}
