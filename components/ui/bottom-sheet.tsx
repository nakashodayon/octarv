"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  close: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export default function BottomSheet({
  open,
  close,
  title,
  className,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Floating sheet */}
          <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 pointer-events-none">
            <motion.div
              key="sheet"
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={cn(
                "pointer-events-auto w-full max-w-sm rounded-3xl bg-background shadow-2xl",
                className
              )}
            >
              {/* Handle + close */}
              <div className="relative flex items-center justify-center pt-4 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                <button
                  onClick={close}
                  className="absolute right-4 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Title */}
              {title && (
                <p className="px-6 pt-1 pb-0 text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {title}
                </p>
              )}

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
