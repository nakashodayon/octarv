"use client";

import { useMemo, useRef, useState } from "react";
import DynamicScrollIslandTOC, { TOC_INTERFACE } from "@/components/ui/dynamic-scroll-island-toc";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  MotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, X, Calendar, Tag, FileText, Sparkles, Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from "lucide-react";
import BottomMenu from "@/components/bottom-menu";

const TOC_DATA: TOC_INTERFACE[] = [
  { name: "All" },
  { name: "Documents", value: "documents" },
  { name: "Images", value: "images" },
  { name: "Notes", value: "notes" },
];

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
}

const DATA: Record<string, DataItem[]> = {
  documents: [
    { url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=70&w=500", height: 280, title: "Project Proposal", description: "Q4 strategic planning document for the upcoming product launch.", tags: ["Business", "Strategy"], date: "2026-03-15", category: "documents", author: "Sarah Chen", likes: 42 },
    { url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=70&w=500", height: 320, title: "Financial Report", description: "Annual financial summary with key metrics and projections.", tags: ["Finance", "Report"], date: "2026-03-10", category: "documents", author: "James Liu", likes: 38 },
    { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=70&w=500", height: 240, title: "Meeting Notes", description: "Summary of client discussion and action items.", tags: ["Meeting", "Client"], date: "2026-03-08", category: "documents", author: "Emily Park", likes: 24 },
    { url: "https://images.unsplash.com/photo-1568667256549-094345857637?q=70&w=500", height: 300, title: "Research Paper", description: "Market analysis and competitive landscape overview.", tags: ["Research", "Analysis"], date: "2026-03-05", category: "documents", author: "David Kim", likes: 56 },
    { url: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=70&w=500", height: 260, title: "Contract Draft", description: "Service agreement template for new partnerships.", tags: ["Legal", "Contract"], date: "2026-03-01", category: "documents", author: "Lisa Wang", likes: 19 },
  ],
  images: [
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=70&w=500", height: 320, title: "Mountain Vista", description: "Breathtaking alpine landscape captured at sunrise.", tags: ["Nature", "Mountains"], date: "2026-03-20", category: "images", author: "Alex Turner", likes: 127 },
    { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=70&w=500", height: 280, title: "Forest Path", description: "Serene walking trail through ancient woodland.", tags: ["Nature", "Forest"], date: "2026-03-18", category: "images", author: "Maya Johnson", likes: 89 },
    { url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=70&w=500", height: 360, title: "Autumn Colors", description: "Vibrant fall foliage reflecting on calm waters.", tags: ["Nature", "Autumn"], date: "2026-03-16", category: "images", author: "Chris Lee", likes: 156 },
    { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=70&w=500", height: 300, title: "Waterfall", description: "Majestic cascade in a tropical rainforest setting.", tags: ["Nature", "Water"], date: "2026-03-14", category: "images", author: "Nina Chen", likes: 203 },
    { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=70&w=500", height: 340, title: "Lake Reflection", description: "Perfect mirror image on a peaceful morning.", tags: ["Nature", "Lake"], date: "2026-03-12", category: "images", author: "Tom Wilson", likes: 178 },
    { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=70&w=500", height: 280, title: "Misty Valley", description: "Ethereal fog rolling through mountain valley.", tags: ["Nature", "Landscape"], date: "2026-03-10", category: "images", author: "Julia Brown", likes: 94 },
  ],
  notes: [
    { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=70&w=500", height: 260, title: "Daily Journal", description: "Personal reflections and goal tracking entries.", tags: ["Personal", "Journal"], date: "2026-03-22", category: "notes", author: "Emma Davis", likes: 31 },
    { url: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=70&w=500", height: 300, title: "Study Notes", description: "Key concepts and learning summaries from courses.", tags: ["Study", "Learning"], date: "2026-03-19", category: "notes", author: "Ryan Smith", likes: 47 },
    { url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=70&w=500", height: 280, title: "Creative Ideas", description: "Brainstorming session for new project concepts.", tags: ["Creative", "Ideas"], date: "2026-03-17", category: "notes", author: "Sophie Miller", likes: 62 },
    { url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=70&w=500", height: 320, title: "Task List", description: "Weekly priorities and action items breakdown.", tags: ["Productivity", "Tasks"], date: "2026-03-15", category: "notes", author: "Kevin Zhang", likes: 28 },
    { url: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?q=70&w=500", height: 240, title: "Quick Notes", description: "Random thoughts and quick capture snippets.", tags: ["Quick", "Capture"], date: "2026-03-13", category: "notes", author: "Amy Taylor", likes: 15 },
  ],
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
  const folderTitle = folderId.charAt(0).toUpperCase() + folderId.slice(1);

  const [active, _setActive] = useState(TOC_DATA[0]);
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const all = useMemo(() => {
    const arr = Object.keys(DATA).reduce<DataItem[]>((acc, key) => {
      return acc.concat(DATA[key].map((item) => item));
    }, []);
    return arr.sort(() => Math.random() - 0.5);
  }, []);

  function setActive(val: TOC_INTERFACE) {
    if (!val.value) _setActive(val);
    setTimeout(() => _setActive(val), 400);
  }

  const filteredData = active.value ? DATA[active.value] : all;

  const handleItemClick = (item: DataItem, idx: number) => {
    setSelectedItem(item);
    setSelectedIndex(idx);
  };

  const handleClose = () => {
    setSelectedItem(null);
    setSelectedIndex(null);
  };

  return (
    <div className="min-h-screen bg-background">
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
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xl border border-border rounded-full px-4 py-2 shadow-sm">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="text-sm font-bold">Home</span>
                  </button>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm font-bold">{folderTitle}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <DynamicScrollIslandTOC
                    data={TOC_DATA}
                    value={active}
                    setValue={setActive}
                    ref={ref}
                    lPrefix={folderId}
                  />
                </div>
                <div className="w-32" />
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
                animate={{ width: "60%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.6, bounce: 0.15 }}
                className="h-screen overflow-hidden border-r border-border bg-background z-30 flex-shrink-0"
              >
                <div className="h-full overflow-y-auto">
                  {/* Detail Header */}
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleClose}
                          className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                          <ArrowLeft className="size-5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <Heart className="size-5 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors" />
                          <span className="text-sm font-medium">{selectedItem.likes || 0}</span>
                        </div>
                        <MessageCircle className="size-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                        <Share2 className="size-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                        <MoreHorizontal className="size-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                        <Bookmark className="size-4" />
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Detail Content */}
                  <div className="p-6">
                    {/* Image */}
                    <motion.div
                      layoutId={`item-${active.value}-${selectedIndex}`}
                      className="rounded-2xl overflow-hidden mb-6"
                    >
                      <img
                        src={selectedItem.url}
                        className="w-full object-cover rounded-2xl"
                        style={{ maxHeight: "60vh" }}
                        alt={selectedItem.title || "Detail view"}
                      />
                    </motion.div>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {selectedItem.author?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{selectedItem.author || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">Creator</p>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-2xl font-bold mb-3">
                      {selectedItem.title || `Item ${selectedIndex + 1}`}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {selectedItem.description || "No description available."}
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {selectedItem.date && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <Calendar className="size-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-sm font-medium">{selectedItem.date}</p>
                          </div>
                        </div>
                      )}
                      {selectedItem.category && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <FileText className="size-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm font-medium capitalize">{selectedItem.category}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10">
                        <Sparkles className="size-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">AI Tagged</p>
                          <p className="text-sm font-medium">Auto-categorized</p>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="size-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">Tags</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-full hover:bg-muted/80 cursor-pointer transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="border-t border-border pt-6">
                      <h3 className="font-bold mb-4">No comments yet</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-bold">Y</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Add a comment to start the conversation"
                          className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinterest Grid (Right or Full) */}
          <motion.div 
            className="flex-1 h-screen overflow-y-auto"
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
                  {filteredData.map((item, idx) => (
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
              <BottomMenu />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
