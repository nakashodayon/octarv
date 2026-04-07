"use client";

import {
  Notification03Icon,
  Search01Icon,
  Sun03Icon,
  Moon02Icon,
  ComputerIcon,
  UserEdit01Icon,
  PlusSignIcon,
  Mic01Icon,
  Camera01Icon,
  PencilEdit02Icon,
  FilterHorizontalIcon,
  AutoConversationsIcon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { logout } from "@/app/logout/actions";
import BottomSheet from "@/components/ui/bottom-sheet";
import { Kbd } from "@/components/ui/kbd";

const MAIN_NAV = [
  { icon: PlusSignIcon, name: "home" },
  { icon: Search01Icon, name: "search" },
  { icon: Notification03Icon, name: "notifications" },
  { icon: UserEdit01Icon, name: "profile" },
  { icon: Sun03Icon, name: "theme" },
];

const HOME_ITEMS = [
  { icon: PencilEdit02Icon, text: "Note" },
  { icon: Mic01Icon, text: "Voice" },
  { icon: Camera01Icon, text: "Screenshot" },
  { icon: NewTwitterIcon, text: "Tweet" },
];

const SEARCH_OPTIONS = [
  { icon: FilterHorizontalIcon, text: "Filter" },
  { icon: AutoConversationsIcon, text: "Trending" },
];

const NOTIFICATION_TYPES = ["Messages", "System Alerts"];

const PROFILE_LINKS = ["My Account", "Settings", "Subscription / Billing"];

const THEME_OPTIONS = [
  { key: "light", icon: Sun03Icon, text: "Light" },
  { key: "dark", icon: Moon02Icon, text: "Dark" },
  { key: "system", icon: ComputerIcon, text: "System" },
];

interface BottomMenuProps {
  onTweetAdded?: (tweetId: string, folderId: string) => void;
  currentFolderId?: string;
}

const BottomMenu = ({ onTweetAdded, currentFolderId }: BottomMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [elementRef] = useMeasure();
  const [hiddenRef, hiddenBounds] = useMeasure();
  const [view, setView] = useState<
    "default" | "home" | "search" | "notifications" | "profile" | "theme"
  >("default");
  const [tweetUrl, setTweetUrl] = useState("");
  const [tweetStep, setTweetStep] = useState<"closed" | "folder" | "input">("closed");
  const [tweetError, setTweetError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [pickedFolderId, setPickedFolderId] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const startTweetFlow = () => {
    if (currentFolderId) {
      setPickedFolderId(currentFolderId);
      setTweetStep("input");
    } else {
      // Fetch folders and show picker
      fetch("/api/folders")
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: Array<{ id: string; name: string }>) => setFolders(rows))
        .catch(() => {});
      setTweetStep("folder");
    }
  };

  const resetTweetFlow = () => {
    setTweetStep("closed");
    setTweetUrl("");
    setTweetError(null);
    setPickedFolderId(null);
  };

  const handleTweetSubmit = async () => {
    const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    if (!match) {
      setTweetError("Invalid X URL");
      return;
    }
    if (!pickedFolderId) {
      setTweetError("Pick a folder");
      return;
    }
    const tweetId = match[1];
    // "all" is virtual — save to the first real folder under the hood
    const realFolderId =
      pickedFolderId === "all" ? folders[0]?.id ?? null : pickedFolderId;
    if (!realFolderId) {
      setTweetError("No folders available");
      return;
    }

    if (currentFolderId) {
      // We're inside a folder page — let the parent handle save + tag + toast UX
      onTweetAdded?.(tweetId, realFolderId);
    } else {
      // Home flow — save directly then navigate so the destination page shows it
      fetch("/api/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId, folderId: realFolderId }),
      })
        .then(() =>
          fetch("/api/tweets/tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tweetId }),
          })
        )
        .catch((e) => console.error("Save tweet failed:", e));
      router.push(`/dashboard/${pickedFolderId}`);
    }

    resetTweetFlow();
    setView("default");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };
  
  // Cmd+X shortcut to open the tweet flow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setView("home");
        startTweetFlow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setView("default");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sharedHover =
    "group transition-all duration-75 px-3 py-2 text-[15px] text-white/60 w-full text-left rounded-full hover:bg-white/10 hover:text-white";

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return null;

      case "home":
        if (tweetStep === "folder") {
          return (
            <div className="p-[6px] py-2 min-w-[240px]">
              <div className="flex items-center gap-2 px-2 pb-1">
                <button
                  onClick={resetTweetFlow}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <span className="text-white/60 text-xs">Pick a folder</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {[{ id: "all", name: "All" }, ...folders].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setPickedFolderId(f.id);
                      setTweetStep("input");
                    }}
                    className={`${sharedHover} flex items-center gap-3`}
                  >
                    <span className="transition-all duration-75">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (tweetStep === "input") {
          return (
            <div className="p-[6px] py-2 min-w-[280px]">
              <div className="flex items-center gap-2 px-2 pb-1">
                <button
                  onClick={() =>
                    currentFolderId ? resetTweetFlow() : setTweetStep("folder")
                  }
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <span className="text-white/60 text-xs">Paste X URL</span>
              </div>
              <div className="flex flex-col gap-1.5 px-2">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="url"
                    value={tweetUrl}
                    onChange={(e) => { setTweetUrl(e.target.value); setTweetError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleTweetSubmit()}
                    placeholder="https://x.com/user/status/..."
                    className="flex-1 bg-white/10 text-white text-sm placeholder:text-white/30 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <button
                    onClick={handleTweetSubmit}
                    disabled={!tweetUrl.trim()}
                    className="text-xs px-3 py-1.5 rounded-full bg-white text-black font-medium disabled:opacity-30 transition-opacity"
                  >
                    Add
                  </button>
                </div>
                {tweetError && (
                  <p className="text-red-400 text-xs px-1">{tweetError}</p>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-0.5 min-w-[230px] p-[6px] py-0.5">
            {HOME_ITEMS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={text === "Tweet" ? startTweetFlow : undefined}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <HugeiconsIcon
                  icon={Icon}
                  size={20}
                  className="text-white/60 group-hover:text-white transition-all duration-75"
                />
                <span className="transition-all duration-75 flex-1 text-left">{text}</span>
                {text === "Tweet" && <Kbd>⌘ X</Kbd>}
              </button>
            ))}
          </div>
        );

      case "search":
        return (
          <div className="space-y-2 min-w-[270px] p-[8px] py-1">
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
              />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-[6px] text-[14.5px] text-white bg-white/10 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent placeholder:text-white/40"
              />
            </div>
            <div className="flex gap-1.5">
              {SEARCH_OPTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  className={`${sharedHover} flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15`}
                >
                  <HugeiconsIcon
                    icon={Icon}
                    size={14}
                    strokeWidth={2}
                    className="text-white/60 group-hover:text-white transition-all duration-75"
                  />
                  <span className="transition-all duration-75">{text}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-0.5 min-w-[210px] p-[6px] py-0.5">
            {NOTIFICATION_TYPES.map((t) => (
              <button key={t} className={sharedHover}>
                <span className="transition-all duration-75">{t}</span>
              </button>
            ))}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-0.5 min-w-[230px] p-[6px] py-0.5">
            {PROFILE_LINKS.map((t) => (
              <button
                key={t}
                className={sharedHover}
                onClick={t === "Settings" ? () => { setSettingsOpen(true); setView("default"); } : undefined}
              >
                <span className="transition-all duration-75">{t}</span>
              </button>
            ))}
            <div className="border-t border-white/10 my-[2px]" />
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-[15px] text-red-400 w-full text-left rounded-full hover:bg-red-500/10 transition-all duration-75"
            >
              Logout
            </button>
          </div>
        );

      case "theme":
        return (
          <div className="flex items-center justify-between gap-1.5 min-w-[270px] p-[6px] py-0.5">
            {THEME_OPTIONS.map(({ key, icon: Icon, text }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 transition-all duration-100 ${
                  theme === key
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/10"
                }`}
              >
                <HugeiconsIcon
                  icon={Icon}
                  size={18}
                  className={`transition-all duration-75 ${
                    theme === key ? "text-white" : "text-white/60"
                  }`}
                />
                <span>{text}</span>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  }, [view, theme, tweetStep, tweetUrl, folders, currentFolderId]);

  return (
    <>
    <BottomSheet open={settingsOpen} close={() => setSettingsOpen(false)} title="Settings">
      <div className="flex items-center justify-between px-6 pt-4 pb-8">
        <div className="size-16 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=160"
            alt="Profile"
            className="size-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-2xl font-bold">Shota Nakayama</span>
          <span className="text-sm text-muted-foreground">@shotanakayama</span>
        </div>
      </div>
    </BottomSheet>
    <div
      ref={containerRef}
      className={cn("relative flex flex-col items-center")}
    >
      {/* Hidden for measurement */}
      <div
        ref={hiddenRef}
        className="absolute left-[-9999px] top-[-9999px] invisible pointer-events-none"
      >
        <div className="rounded-[24px] bg-black py-1">
          {content}
        </div>
      </div>

      {/* Animated submenu */}
      <AnimatePresence mode="wait">
        {view !== "default" && (
          <motion.div
            key="submenu"
            initial={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              originX: 0.5,
            }}
            animate={{
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              height: hiddenBounds.height || "auto",
              width: hiddenBounds.width || "auto",
              originY: 1,
              originX: 0.5,
            }}
            exit={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              originX: 0.5,
            }}
            transition={{
              duration: 0.3,
              ease: [0.45, 0, 0.25, 1],
            }}
            style={{
              transformOrigin: "bottom center",
            }}
            className="absolute bottom-[70px] overflow-hidden"
          >
            <div
              ref={elementRef}
              className="rounded-[24px] bg-black"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={view === "home" ? `home-${tweetStep}` : view}
                  initial={{
                    opacity: 0,
                    scale: 0.96,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(12px)",
                  }}
                  transition={{
                    duration: 0.25,
                    ease: [0.42, 0, 0.58, 1],
                  }}
                  className="py-1"
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-black rounded-[24px] p-1 mt-3 z-10">
        {MAIN_NAV.map(({ icon: Icon, name }) => (
          <button
            key={name}
            className={`p-3 rounded-full transition-all ${
              view === name ? "bg-white/10" : "hover:bg-white/10"
            }`}
            onClick={() => {
                if (name !== "home") resetTweetFlow();
                setView(view === name ? "default" : (name as any));
              }}
          >
            <HugeiconsIcon
              icon={Icon}
              size={22}
              className={`transition-all ${
                view === name ? "text-white" : "text-white/60"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
    </>
  );
};

export default BottomMenu;
