"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export type ButtonStatus = "idle" | "loading" | "success";

interface StatusButtonProps {
  status: ButtonStatus;
  idleText: string;
  loadingText: string;
  successText: string;
  className?: string;
  type?: "submit" | "button";
}

export function StatusButton({
  status,
  idleText,
  loadingText,
  successText,
  className,
  type = "submit",
}: StatusButtonProps) {
  const text = (() => {
    switch (status) {
      case "idle":
        return idleText;
      case "loading":
        return loadingText;
      case "success":
        return successText;
    }
  })();

  return (
    <div className="relative inline-flex w-full font-sans">
      <Button
        type={type}
        className={cn(
          "relative rounded-full h-12 px-8 text-base font-medium transition-all duration-300 w-full disabled:opacity-100",
          status === "idle"
            ? "transition-colors"
            : "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed border-muted shadow-sm",
          className
        )}
        variant="default"
        disabled={status !== "idle"}
      >
        <span className="flex items-center justify-center gap-2">
          {status === "loading" && (
            <Loader2 className="size-4 animate-spin" />
          )}
          {status === "success" && (
            <Check className="size-4" />
          )}
          {text}
        </span>
      </Button>
    </div>
  );
}
