"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  MotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Tag, FileText } from "lucide-react";
import BottomMenu from "@/components/bottom-menu";
import { AnimatedTags, TagItem } from "@/components/ui/animated-tags";
import { XTweetCard, XTweetCardSkeleton } from "@/components/ui/x-tweet-card";
import { FolderTagsEditor } from "@/components/folder-tags-editor";
import { sileo, Toaster } from "sileo";

interface DataItem {
  url: string;
  height: number;
  title?: string;
  description?: string;
  tags?: string[];
  date?: string;
  category?: string;
  author?: string;
  likes?: number;
  type?: "image" | "tweet" | "pending";
  tweetId?: string;
}

const DATA: Record<string, DataItem[]> = {
  documents: [],
  images: [],
  notes: [],
};

const animation: MotionProps = {
  variants: {
    hidden: { maskPosition: "0% 150%", filter: "blur(10px)", opacity: 0.5 },
    show: { maskPosition: "0% 0%", filter: "blur(0px)", opacity: 1 },
  },
  initial: "hidden",
  animate: "show",
  exit: "hidden",
};

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;
  const isAll = folderId === "all";

  const [folderTitle, setFolderTitle] = useState<string>(isAll ? "All" : "…");
  const [folderMatchTags, setFolderMatchTags] = useState<string[]>([]);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);
  const active = { name: "All", value: undefined as string | undefined };
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [savedTweets, setSavedTweets] = useState<DataItem[]>([]);
  const [sessionNewIds, setSessionNewIds] = useState<string[]>([]);

  // Load folder name + default folder for "all" view
  useEffect(() => {
    fetch("/api/folders")
      .then((r) => (r.ok ? r.json() : []))
      .then((folders: Array<{ id: string; name: string; match_tags?: string[] }>) => {
        if (folders.length > 0) setDefaultFolderId(folders[0].id);
        if (!isAll) {
          const f = folders.find((x) => x.id === folderId);
          if (f) {
            setFolderTitle(f.name);
            setFolderMatchTags(f.match_tags ?? []);
          }
        }
      })
      .catch(() => {});
  }, [folderId, isAll]);

  // Load saved tweets from DB (filtered by folder unless "all")
  useEffect(() => {
    const url = isAll ? "/api/tweets" : `/api/tweets?folderId=${folderId}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Array<{ tweet_id: string; tweet_data: any; tags: string[]; ai_title: string | null; ai_description: string | null; created_at: string }>) => {
        setSavedTweets(rows.map((row) => ({
          url: "",
          height: 280,
          type: "tweet" as const,
          tweetId: row.tweet_id,
          title: row.ai_title ?? row.tweet_data?.author?.name ?? "Tweet",
          description: row.ai_description ?? row.tweet_data?.text?.slice(0, 120),
          category: "notes",
          date: row.created_at?.slice(0, 10),
          tags: row.tags ?? [],
        })));
      })
      .catch(() => {});
  }, [folderId, isAll]);

  const toastBase = {
    fill: "#0a0a0a",
    roundness: 18,
    styles: {
      title: "text-white! text-sm! font-medium!",
      description: "text-white/50! text-xs!",
      badge: "bg-white/10!",
    },
  };

  const handleTweetAdded = (tweetId: string, targetFolderId: string) => {
    setSessionNewIds((prev) => [tweetId, ...prev.filter((id) => id !== tweetId)]);
    setSavedTweets((prev) => [
      { url: "", height: 280, type: "pending", tweetId, category: "notes" },
      ...prev.filter((t) => t.tweetId !== tweetId),
    ]);

    // Phase 1: fetch tweet — toast resolves as soon as card is ready
    const fetchPromise = fetch("/api/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId, folderId: targetFolderId }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("fetch failed")))
      .then((data) => {
        setSavedTweets((prev) =>
          prev.map((t) =>
            t.tweetId === tweetId
              ? { ...t, type: "tweet" as const, title: data.author?.name ?? "Tweet", description: data.text?.slice(0, 120) }
              : t
          )
        );

        // Phase 2: trigger tag generation directly from client (no fire-and-forget on server)
        fetch("/api/tweets/tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetId }),
        })
          .then(async (r) => {
            const text = await r.text();
            if (!r.ok) {
              console.error("Tag API error:", r.status, text);
              throw new Error(`tag failed: ${r.status} ${text}`);
            }
            return JSON.parse(text);
          })
          .then((res: { tags: string[]; title?: string; description?: string }) => {
            setSavedTweets((prev) =>
              prev.map((t) =>
                t.tweetId === tweetId
                  ? {
                      ...t,
                      tags: res.tags ?? t.tags,
                      title: res.title ?? t.title,
                      description: res.description ?? t.description,
                    }
                  : t
              )
            );
          })
          .catch((e) => {
            console.error("Tag generation failed:", e);
          });

        return data;
      });

    sileo.promise(fetchPromise, {
      loading: { ...toastBase, title: "タグ付け中" },
      success: () => ({ ...toastBase, title: "完了", duration: 2000 }),
      error: { ...toastBase, title: "失敗しました", duration: 2000 },
    });

    fetchPromise.catch(() => {
      setSavedTweets((prev) => prev.filter((t) => t.tweetId !== tweetId));
    });
  };

  // All unique tags across the user's tweets — used as autocomplete suggestions
  const allTagSuggestions = useMemo(() => {
    const set = new Set<string>();
    savedTweets.forEach((t) => (t.tags ?? []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [savedTweets]);

  const updateTweetTags = (tweetId: string, nextTags: string[]) => {
    setSavedTweets((prev) =>
      prev.map((t) => (t.tweetId === tweetId ? { ...t, tags: nextTags } : t))
    );
    fetch("/api/tweets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId, tags: nextTags }),
    }).catch((e) => console.error("Update tags failed:", e));
  };

  // Always reflect latest savedTweets data in the detail panel
  const displayItem = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.tweetId) {
      const live = savedTweets.find((t) => t.tweetId === selectedItem.tweetId);
      return live ?? selectedItem;
    }
    return selectedItem;
  }, [selectedItem, savedTweets]);

  const notesData = useMemo(() => {
    const staticNotes = DATA.notes.filter((n) => n.type !== "tweet");
    return [...savedTweets, ...staticNotes];
  }, [savedTweets]);

  const dataWithSaved = useMemo(() => ({
    ...DATA,
    notes: notesData,
  }), [notesData]);

  const all = useMemo(() => {
    const arr = Object.keys(dataWithSaved).reduce<DataItem[]>((acc, key) => {
      return acc.concat(dataWithSaved[key as keyof typeof dataWithSaved].map((item) => item));
    }, []);
    return arr.sort(() => Math.random() - 0.5);
  }, [dataWithSaved]);

  const baseFilteredData = all;

  // When a tweet is selected, hide it from the gallery and sort by tag overlap.
  const filteredData = useMemo(() => {
    if (!selectedItem || !selectedItem.tweetId) return baseFilteredData;
    const withoutSelected = baseFilteredData.filter(
      (d) => d.tweetId !== selectedItem.tweetId
    );
    const selectedTags = new Set((selectedItem.tags ?? []).map((t) => t.toLowerCase()));
    if (selectedTags.size === 0) return withoutSelected;

    const score = (item: DataItem) => {
      const itemTags = (item.tags ?? []).map((t) => t.toLowerCase());
      let overlap = 0;
      for (const t of itemTags) if (selectedTags.has(t)) overlap += 1;
      return overlap;
    };

    return [...withoutSelected].sort((a, b) => score(b) - score(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFilteredData, selectedItem?.tweetId, selectedItem?.tags?.join(",")]);

  const handleItemClick = (item: DataItem, idx: number) => {
    setSelectedItem(item);
    setSelectedIndex(idx);
  };

  const handleClose = () => {
    setSelectedItem(null);
    setSelectedIndex(null);
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Toaster position="bottom-right" />
      <MotionConfig transition={{ duration: 0.8 }}>
        {/* Header - only show when no detail view */}
        <AnimatePresence>
          {!selectedItem && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-0 left-0 right-0 z-40"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2 bg-black rounded-full px-4 py-2 shadow-sm">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="text-sm font-bold">Home</span>
                  </button>
                  <span className="text-white/60">/</span>
                  <span className="text-sm font-bold text-white">{folderTitle}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <ScrollIndicator containerRef={ref} />
                </div>
                {!isAll ? (
                  <div className="absolute right-6 top-4">
                    <FolderTagsEditor
                      folderId={folderId}
                      initialTags={folderMatchTags}
                      suggestions={allTagSuggestions}
                      onChange={(next) => {
                        setFolderMatchTags(next);
                        // Refetch tweets so the new tag union takes effect
                        fetch(`/api/tweets?folderId=${folderId}`)
                          .then((r) => (r.ok ? r.json() : []))
                          .then((rows: Array<{ tweet_id: string; tweet_data: any; tags: string[]; ai_title: string | null; ai_description: string | null; created_at: string }>) => {
                            setSavedTweets(rows.map((row) => ({
                              url: "",
                              height: 280,
                              type: "tweet" as const,
                              tweetId: row.tweet_id,
                              title: row.ai_title ?? row.tweet_data?.author?.name ?? "Tweet",
                              description: row.ai_description ?? row.tweet_data?.text?.slice(0, 120),
                              category: "notes",
                              date: row.created_at?.slice(0, 10),
                              tags: row.tags ?? [],
                            })));
                          })
                          .catch(() => {});
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Layout */}
        <div className="flex h-screen">
          {/* Pinterest-style Detail Panel (Left) */}
          <AnimatePresence>
            {selectedItem && selectedIndex !== null && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 720, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.6, bounce: 0.15 }}
                className="h-full overflow-hidden border-r border-border bg-background z-30 flex-shrink-0"
              >
                <div className="h-full overflow-y-auto overflow-x-hidden">
                  {/* Detail Content: arrow on the left, content column to the right */}
                  <div className="flex gap-4 p-6">
                    <button
                      onClick={handleClose}
                      className="shrink-0 p-2 h-fit rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <ArrowLeft className="size-5" />
                    </button>

                    <div className="flex-1 min-w-0 max-w-xl">
                      {/* Image / Tweet */}
                      <div className="mb-6">
                        {selectedItem.type === "tweet" ? (
                          <motion.div
                            layoutId={`item-${active.value}-${selectedIndex}`}
                            className="rounded-2xl overflow-hidden w-full"
                          >
                            <XTweetCard
                              id={selectedItem.tweetId!}
                              className="w-full"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            layoutId={`item-${active.value}-${selectedIndex}`}
                            className="rounded-2xl overflow-hidden w-full"
                          >
                            {selectedItem.url && (
                              <img
                                src={selectedItem.url}
                                className="w-full object-cover rounded-2xl"
                                alt={selectedItem.title || "Detail view"}
                              />
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-2xl font-bold mb-3">
                        {displayItem?.title || `Item ${selectedIndex + 1}`}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        {displayItem?.description || "No description available."}
                      </p>

                      {/* Tags */}
                      {displayItem && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Tag className="size-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">Tags</p>
                          </div>
                          <AnimatedTags
                            tags={(displayItem.tags ?? []).map((tag, i) => ({
                              id: `${tag}-${i}`,
                              label: tag,
                            }))}
                            editable={true}
                            suggestions={allTagSuggestions}
                            onAdd={(label) => updateTweetTags(displayItem.tweetId!, [...(displayItem.tags ?? []), label])}
                            onRemove={(id) => {
                              const idx = parseInt(id.split("-").pop() ?? "-1", 10);
                              const next = (displayItem.tags ?? []).filter((_, i) => i !== idx);
                              updateTweetTags(displayItem.tweetId!, next);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinterest Grid (Right or Full) */}
          <motion.div 
            className="flex-1 h-full overflow-y-auto"
            animate={{ 
              paddingTop: selectedItem ? "1.5rem" : "5rem",
            }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.15 }}
            ref={ref}
          >
            <div className="px-6 pb-32">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={active.value}
                  className={cn(
                    "columns-2 md:columns-3 gap-4",
                    selectedItem ? "lg:columns-2" : "lg:columns-4",
                    "[mask-image:linear-gradient(to_bottom,black_0%,black_80%,transparent_100%)] [mask-size:100%_300%] [mask-repeat:no-repeat]",
                  )}
                  {...animation}
                >
                  {(() => {
                    // Pin newly added (this session) tweets to the top-left
                    const newItems = sessionNewIds
                      .map((id) => filteredData.find((d) => d.tweetId === id))
                      .filter(Boolean) as DataItem[];
                    const rest = filteredData.filter(
                      (d) => !d.tweetId || !sessionNewIds.includes(d.tweetId)
                    );
                    return [...newItems, ...rest];
                  })().map((item, idx) => (
                    <motion.div
                      key={`${active.value}-${idx}`}
                      layoutId={selectedIndex === idx ? undefined : `item-${active.value}-${idx}`}
                      className={cn(
                        "relative mb-4 overflow-hidden rounded-xl break-inside-avoid group cursor-pointer",
                        selectedIndex === idx && "opacity-30"
                      )}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: selectedIndex === idx ? 0.3 : 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleItemClick(item, idx)}
                    >
                      {item.type === "pending" ? (
                        <XTweetCardSkeleton />
                      ) : item.type === "tweet" && item.tweetId ? (
                        <XTweetCard
                          id={item.tweetId}
                          preview
                          className="transition-transform duration-300 group-hover:scale-[1.02] w-full"
                        />
                      ) : (
                        <>
                          <img
                            src={item.url}
                            className="w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                            style={{ height: item.height }}
                            alt={item.title || `${active.name} item ${idx + 1}`}
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex flex-col justify-end p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                                AI
                              </span>
                            </div>
                            <p className="text-white text-sm font-bold line-clamp-2">
                              {item.title || `${active.name} Item ${idx + 1}`}
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Bottom Menu - only show when no detail view */}
        <AnimatePresence>
          {!selectedItem && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-0 right-0 flex justify-center z-40"
            >
              <BottomMenu
                onTweetAdded={handleTweetAdded}
                currentFolderId={isAll ? defaultFolderId ?? undefined : folderId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
