"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AnimatedTags } from "@/components/ui/animated-tags";

interface ExistingProject {
  id: string;
  name: string;
  prompt: string;
  tag_hints: string[];
  target_folder_ids: string[];
  schedule_hour: number;
  min_likes?: number;
  min_retweets?: number;
  min_replies?: number;
}

interface ProjectCreatePopupProps {
  onClose: () => void;
  onCreated: () => void;
  existing?: ExistingProject;
}

interface Folder {
  id: string;
  name: string;
}

export function ProjectCreatePopup({ onClose, onCreated, existing }: ProjectCreatePopupProps) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [prompt, setPrompt] = useState(existing?.prompt ?? "");
  const [tagHints, setTagHints] = useState<string[]>(existing?.tag_hints ?? []);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(existing?.target_folder_ids ?? []);
  const [scheduleHour, setScheduleHour] = useState(existing?.schedule_hour ?? 9);
  const [minLikes, setMinLikes] = useState(existing?.min_likes ?? 0);
  const [minRetweets, setMinRetweets] = useState(existing?.min_retweets ?? 0);
  const [minReplies, setMinReplies] = useState(existing?.min_replies ?? 0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Folder[]) => setFolders(rows))
      .catch(() => {});

    fetch("/api/tweets")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ tags?: string[] }>) => {
        const set = new Set<string>();
        rows.forEach((r) => (r.tags ?? []).forEach((t) => set.add(t)));
        setTagSuggestions(Array.from(set).sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        ...(isEdit ? { id: existing!.id } : {}),
        name,
        prompt,
        tagHints,
        targetFolderIds: selectedFolderIds,
        scheduleHour,
        minLikes,
        minRetweets,
        minReplies,
      };
      const res = await fetch("/api/research/projects", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-background border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">{isEdit ? "Edit Project" : "New Research Project"}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-muted"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Daily AI agents brief"
                className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                What to research
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Track the latest releases and discussions around AI coding agents..."
                rows={4}
                className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Tag hints */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Related tags (optional)
              </label>
              <AnimatedTags
                tags={tagHints.map((t, i) => ({ id: `${t}-${i}`, label: t }))}
                editable
                suggestions={tagSuggestions}
                onAdd={(label) => setTagHints((prev) => [...prev, label])}
                onRemove={(id) => {
                  const idx = parseInt(id.split("-").pop() ?? "-1", 10);
                  if (idx < 0) return;
                  setTagHints((prev) => prev.filter((_, i) => i !== idx));
                }}
              />
            </div>

            {/* Folders */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Save findings to
              </label>
              <div className="flex flex-wrap gap-2">
                {folders.length === 0 && (
                  <span className="text-xs text-muted-foreground">No folders yet</span>
                )}
                {folders.map((f) => {
                  const active = selectedFolderIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFolder(f.id)}
                      className={
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors " +
                        (active
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground hover:bg-muted/70")
                      }
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Run daily at
              </label>
              <select
                value={scheduleHour}
                onChange={(e) => setScheduleHour(parseInt(e.target.value, 10))}
                className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>

            {/* Engagement filters */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Minimum engagement
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">Likes</span>
                  <input
                    type="number"
                    min={0}
                    value={minLikes}
                    onChange={(e) => setMinLikes(parseInt(e.target.value || "0", 10))}
                    className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">Retweets</span>
                  <input
                    type="number"
                    min={0}
                    value={minRetweets}
                    onChange={(e) => setMinRetweets(parseInt(e.target.value || "0", 10))}
                    className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground mb-1">Replies</span>
                  <input
                    type="number"
                    min={0}
                    value={minReplies}
                    onChange={(e) => setMinReplies(parseInt(e.target.value || "0", 10))}
                    className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !prompt.trim() || submitting}
              className="mt-2 w-full py-3 rounded-full bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create project"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
