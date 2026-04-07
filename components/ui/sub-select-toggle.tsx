"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SubSelectOption<T extends string = string> {
  label: string;
  value: T;
}

interface SubSelectToggleProps<T extends string = string> {
  options: SubSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SubSelectToggle<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SubSelectToggleProps<T>) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full bg-black p-1 shadow-sm",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative px-5 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors"
          >
            {isActive && (
              <motion.div
                layoutId="sub-select-toggle-thumb"
                transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                className="absolute inset-0 rounded-full bg-white"
              />
            )}
            <span
              className={cn(
                "relative z-10",
                isActive ? "text-black" : ""
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
