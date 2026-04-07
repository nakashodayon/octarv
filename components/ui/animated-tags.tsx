"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagItem {
  id: string;
  label: string;
}

export interface AnimatedTagsProps {
  tags: TagItem[];
  onRemove?: (id: string) => void;
  onAdd?: (label: string) => void;
  editable?: boolean;
  className?: string;
  tagClassName?: string;
  suggestions?: string[];
}

export function AnimatedTags({
  tags,
  onRemove,
  onAdd,
  editable = false,
  className,
  tagClassName,
  suggestions = [],
}: AnimatedTagsProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isAdding, setIsAdding] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");

  // Filter suggestions: match query and exclude already-applied tags
  const existingLabels = new Set(tags.map((t) => t.label.toLowerCase()));
  const filteredSuggestions = suggestions
    .filter((s) => !existingLabels.has(s.toLowerCase()))
    .filter((s) =>
      newTagValue.trim()
        ? s.toLowerCase().includes(newTagValue.trim().toLowerCase())
        : true
    )
    .slice(0, 8);

  const commitTag = (label: string) => {
    const value = label.trim();
    if (value && onAdd) {
      onAdd(value);
      setNewTagValue("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTag(newTagValue);
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTagValue("");
    }
  };

  const tagVariants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.8, filter: "blur(4px)" },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.8, filter: "blur(4px)" },
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <AnimatePresence mode="popLayout">
        {tags.map((tag) => (
          <motion.div
            key={tag.id}
            layout
            variants={tagVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 1,
            }}
            className={cn(
              "group relative flex items-center gap-1.5 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-full",
              "hover:bg-muted/80 transition-colors cursor-default",
              editable && onRemove && "pr-3",
              tagClassName
            )}
          >
            <span>{tag.label}</span>
            {editable && onRemove && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRemove(tag.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-background/50 transition-colors"
                aria-label={`Remove ${tag.label}`}
              >
                <X className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.button>
            )}
          </motion.div>
        ))}

        {/* Add Tag Button / Input — no animation, instant swap */}
        {editable && onAdd && (
          <div key="add-tag">
            {isAdding ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => {
                      if (!newTagValue.trim()) setIsAdding(false);
                    }, 150);
                  }}
                  placeholder="Add tag..."
                  className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-full outline-none focus:ring-2 focus:ring-primary/30 min-w-[140px]"
                  autoFocus
                />
                {filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl p-1 min-w-[160px] max-h-64 overflow-y-auto">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitTag(s);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-muted/50 text-muted-foreground text-sm font-medium rounded-full hover:bg-muted hover:text-foreground transition-colors border-2 border-dashed border-muted-foreground/30"
              >
                <Plus className="size-4" />
                <span>Add Tag</span>
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedTags;
