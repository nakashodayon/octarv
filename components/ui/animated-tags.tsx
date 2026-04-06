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
}

export function AnimatedTags({
  tags,
  onRemove,
  onAdd,
  editable = false,
  className,
  tagClassName,
}: AnimatedTagsProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isAdding, setIsAdding] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");

  const handleAddTag = () => {
    if (newTagValue.trim() && onAdd) {
      onAdd(newTagValue.trim());
      setNewTagValue("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
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

        {/* Add Tag Button / Input */}
        {editable && onAdd && (
          <motion.div
            layout
            key="add-tag"
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
          >
            <AnimatePresence mode="wait">
              {isAdding ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center"
                >
                  <input
                    type="text"
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      if (!newTagValue.trim()) {
                        setIsAdding(false);
                      }
                    }}
                    placeholder="Add tag..."
                    className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-full outline-none focus:ring-2 focus:ring-primary/30 min-w-[100px]"
                    autoFocus
                  />
                </motion.div>
              ) : (
                <motion.button
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-muted/50 text-muted-foreground text-sm font-medium rounded-full hover:bg-muted hover:text-foreground transition-colors border-2 border-dashed border-muted-foreground/30"
                >
                  <Plus className="size-4" />
                  <span>Add Tag</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedTags;
