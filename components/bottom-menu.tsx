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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

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

const cKey = "bottom-menu-wrapper";
const iKey = "bottom-menu-items";

const BottomMenu = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<
    "default" | "home" | "search" | "notifications" | "profile" | "theme"
  >("default");

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setView("default");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavClick = (name: string) => {
    if (view === name) {
      setOpen(false);
      setView("default");
    } else {
      setOpen(true);
      setView(name as typeof view);
    }
  };

  const sharedHover =
    "group transition-all duration-75 px-3 py-2 text-[15px] text-white/60 w-full text-left rounded-full hover:bg-white/10 hover:text-white";

  const content = useMemo(() => {
    switch (view) {
      case "home":
        return (
          <div className="space-y-0.5 p-[6px] py-0.5">
            {HOME_ITEMS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <HugeiconsIcon
                  icon={Icon}
                  size={20}
                  className="text-white/60 group-hover:text-white transition-all duration-75"
                />
                <span className="transition-all duration-75">{text}</span>
              </button>
            ))}
          </div>
        );

      case "search":
        return (
          <div className="space-y-2 p-[8px] py-1">
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
          <div className="space-y-0.5 p-[8px] py-0.5">
            {NOTIFICATION_TYPES.map((t) => (
              <button key={t} className={sharedHover}>
                <span className="transition-all duration-75">{t}</span>
              </button>
            ))}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-0.5 p-[8px] py-0.5">
            {PROFILE_LINKS.map((t) => (
              <button key={t} className={sharedHover}>
                <span className="transition-all duration-75">{t}</span>
              </button>
            ))}
            <div className="border-t border-white/10 my-[2px]" />
            <button className="px-3 py-2 text-[15px] text-red-400 w-full text-left rounded-full hover:bg-red-500/10 transition-all duration-75">
              Logout
            </button>
          </div>
        );

      case "theme":
        return (
          <div className="flex items-center justify-between gap-1.5 p-[8px] py-0.5">
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
  }, [view, theme, setTheme]);

  const transition = { type: "spring", duration: 0.5, bounce: 0.1 };

  const NavButtons = ({ isOpen }: { isOpen: boolean }) => (
    <motion.div layoutId={iKey} layout="position" className="flex items-center gap-1 p-1">
      {MAIN_NAV.map(({ icon: Icon, name }) => (
        <button
          key={name}
          className={`p-3 rounded-full transition-all ${
            view === name && isOpen ? "bg-white/10" : "hover:bg-white/10"
          }`}
          onClick={() => handleNavClick(name)}
        >
          <HugeiconsIcon
            icon={Icon}
            size={22}
            className={`transition-all ${
              view === name && isOpen ? "text-white" : "text-white/60"
            }`}
          />
        </button>
      ))}
    </motion.div>
  );

  return (
    <MotionConfig transition={transition}>
      {/* Backdrop */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            role="button"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              setView("default");
            }}
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-50 cursor-pointer select-none">
        {!open ? (
          /* Closed state */
          <motion.div
            layoutId={cKey}
            style={{ borderRadius: 24 }}
            className="bg-black overflow-hidden"
          >
            <NavButtons isOpen={false} />
          </motion.div>
        ) : (
          /* Open state */
          <motion.div
            layoutId={cKey}
            style={{ borderRadius: 24 }}
            className="bg-black overflow-hidden"
          >
            {/* Content area - above toolbar */}
            <AnimatePresence mode="popLayout" initial={false}>
              {content && (
                <motion.div
                  key={view}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-white/10"
                >
                  {content}
                </motion.div>
              )}
            </AnimatePresence>
            <NavButtons isOpen={true} />
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
};

export default BottomMenu;
