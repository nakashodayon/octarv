"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tag, X } from "lucide-react";
import { AnimatedTags } from "@/components/ui/animated-tags";
import { cn } from "@/lib/utils";

interface FolderTagsEditorProps {
  folderId: string;
  initialTags?: string[];
  suggestions?: string[];
  onChange?: (tags: string[]) => void;
  className?: string;
}

export function FolderTagsEditor({
  folderId,
  initialTags = [],
  suggestions = [],
  onChange,
  className,
}: FolderTagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTags(initialTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTags.join(",")]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Ignore clicks on elements that have been detached (e.g. a suggestion
      // button that was just removed by a re-render after commit).
      if (!document.body.contains(target)) return;
      if (wrapRef.current && !wrapRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const persist = async (next: string[]) => {
    setTags(next);
    onChange?.(next);
    try {
      await fetch("/api/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId, matchTags: next }),
      });
    } catch (e) {
      console.error("Update folder match_tags failed:", e);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-bold text-white/80 hover:text-white transition-colors"
      >
        <Tag className="size-4" />
        <span>{tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? "s" : ""}` : "Add Tag"}</span>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="absolute top-12 right-0 z-50 w-80 rounded-3xl bg-black p-4 text-white/80 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-white/50">
                Folder Tags
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <AnimatedTags
              tags={tags.map((t, i) => ({ id: `${t}-${i}`, label: t }))}
              editable
              suggestions={suggestions}
              onAdd={(label) => persist([...tags, label])}
              onRemove={(id) => {
                const idx = parseInt(id.split("-").pop() ?? "-1", 10);
                if (idx < 0) return;
                persist(tags.filter((_, i) => i !== idx));
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
