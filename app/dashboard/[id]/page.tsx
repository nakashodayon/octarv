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
import { ArrowLeft, X, Calendar, Tag, FileText, Sparkles } from "lucide-react";
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
}

const DATA: Record<string, DataItem[]> = {
  documents: [
    { url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=70&w=500", height: 280, title: "Project Proposal", description: "Q4 strategic planning document for the upcoming product launch.", tags: ["Business", "Strategy"], date: "2026-03-15", category: "documents" },
    { url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=70&w=500", height: 320, title: "Financial Report", description: "Annual financial summary with key metrics and projections.", tags: ["Finance", "Report"], date: "2026-03-10", category: "documents" },
    { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=70&w=500", height: 240, title: "Meeting Notes", description: "Summary of client discussion and action items.", tags: ["Meeting", "Client"], date: "2026-03-08", category: "documents" },
    { url: "https://images.unsplash.com/photo-1568667256549-094345857637?q=70&w=500", height: 300, title: "Research Paper", description: "Market analysis and competitive landscape overview.", tags: ["Research", "Analysis"], date: "2026-03-05", category: "documents" },
    { url: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=70&w=500", height: 260, title: "Contract Draft", description: "Service agreement template for new partnerships.", tags: ["Legal", "Contract"], date: "2026-03-01", category: "documents" },
  ],
  images: [
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=70&w=500", height: 320, title: "Mountain Vista", description: "Breathtaking alpine landscape captured at sunrise.", tags: ["Nature", "Mountains"], date: "2026-03-20", category: "images" },
    { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=70&w=500", height: 280, title: "Forest Path", description: "Serene walking trail through ancient woodland.", tags: ["Nature", "Forest"], date: "2026-03-18", category: "images" },
    { url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=70&w=500", height: 360, title: "Autumn Colors", description: "Vibrant fall foliage reflecting on calm waters.", tags: ["Nature", "Autumn"], date: "2026-03-16", category: "images" },
    { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=70&w=500", height: 300, title: "Waterfall", description: "Majestic cascade in a tropical rainforest setting.", tags: ["Nature", "Water"], date: "2026-03-14", category: "images" },
    { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=70&w=500", height: 340, title: "Lake Reflection", description: "Perfect mirror image on a peaceful morning.", tags: ["Nature", "Lake"], date: "2026-03-12", category: "images" },
    { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=70&w=500", height: 280, title: "Misty Valley", description: "Ethereal fog rolling through mountain valley.", tags: ["Nature", "Landscape"], date: "2026-03-10", category: "images" },
  ],
  notes: [
    { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=70&w=500", height: 260, title: "Daily Journal", description: "Personal reflections and goal tracking entries.", tags: ["Personal", "Journal"], date: "2026-03-22", category: "notes" },
    { url: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=70&w=500", height: 300, title: "Study Notes", description: "Key concepts and learning summaries from courses.", tags: ["Study", "Learning"], date: "2026-03-19", category: "notes" },
    { url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=70&w=500", height: 280, title: "Creative Ideas", description: "Brainstorming session for new project concepts.", tags: ["Creative", "Ideas"], date: "2026-03-17", category: "notes" },
    { url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=70&w=500", height: 320, title: "Task List", description: "Weekly priorities and action items breakdown.", tags: ["Productivity", "Tasks"], date: "2026-03-15", category: "notes" },
    { url: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?q=70&w=500", height: 240, title: "Quick Notes", description: "Random thoughts and quick capture snippets.", tags: ["Quick", "Capture"], date: "2026-03-13", category: "notes" },
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
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-40">
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
        </div>

        {/* Pinterest Grid */}
        <div 
          className="pt-20 pb-32 px-6 h-screen overflow-y-auto" 
          ref={ref}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={active.value}
              className={cn(
                "columns-2 md:columns-3 lg:columns-4 gap-4",
                "[mask-image:linear-gradient(to_bottom,black_0%,black_80%,transparent_100%)] [mask-size:100%_300%] [mask-repeat:no-repeat]",
              )}
              {...animation}
            >
              {filteredData.map((item, idx) => (
                <motion.div
                  key={`${active.value}-${idx}`}
                  layoutId={`item-${active.value}-${idx}`}
                  className="relative mb-4 overflow-hidden rounded-xl break-inside-avoid group cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
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

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedItem && selectedIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={handleClose}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ backdropFilter: "blur(0px)" }}
                animate={{ backdropFilter: "blur(20px)" }}
                exit={{ backdropFilter: "blur(0px)" }}
                className="absolute inset-0 bg-black/60"
              />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                className="relative z-10 w-full max-w-5xl flex gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: Metadata Card (30%) */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="w-[30%] bg-background/95 backdrop-blur-xl rounded-2xl border border-border p-6 flex flex-col gap-4"
                >
                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="absolute top-4 left-4 p-2 rounded-full bg-background/80 hover:bg-background border border-border transition-colors"
                  >
                    <X className="size-4" />
                  </button>

                  <div className="mt-8">
                    {/* Title */}
                    <h2 className="text-xl font-bold mb-2">
                      {selectedItem.title || `Item ${selectedIndex + 1}`}
                    </h2>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                      {selectedItem.description || "No description available."}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-4">
                      {/* Date */}
                      {selectedItem.date && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Calendar className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-sm font-medium">{selectedItem.date}</p>
                          </div>
                        </div>
                      )}

                      {/* Category */}
                      {selectedItem.category && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm font-medium capitalize">{selectedItem.category}</p>
                          </div>
                        </div>
                      )}

                      {/* AI Tag */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">AI Tagged</p>
                          <p className="text-sm font-medium">Auto-categorized</p>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="size-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-medium">Tags</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Right: Content Card (70%) */}
                <motion.div
                  layoutId={`item-${active.value}-${selectedIndex}`}
                  className="w-[70%] rounded-2xl overflow-hidden"
                >
                  <img
                    src={selectedItem.url}
                    className="w-full h-full max-h-[80vh] object-cover rounded-2xl"
                    alt={selectedItem.title || "Detail view"}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Menu */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40">
          <BottomMenu />
        </div>
      </MotionConfig>
    </div>
  );
}
