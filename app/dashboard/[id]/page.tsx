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
import { ArrowLeft } from "lucide-react";
import BottomMenu from "@/components/bottom-menu";

const TOC_DATA: TOC_INTERFACE[] = [
  { name: "All" },
  { name: "Documents", value: "documents" },
  { name: "Images", value: "images" },
  { name: "Notes", value: "notes" },
];

const DATA: Record<string, { url: string; height: number }[]> = {
  documents: [
    { url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=70&w=500", height: 280 },
    { url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=70&w=500", height: 320 },
    { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=70&w=500", height: 240 },
    { url: "https://images.unsplash.com/photo-1568667256549-094345857637?q=70&w=500", height: 300 },
    { url: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=70&w=500", height: 260 },
  ],
  images: [
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=70&w=500", height: 320 },
    { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=70&w=500", height: 280 },
    { url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=70&w=500", height: 360 },
    { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=70&w=500", height: 300 },
    { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=70&w=500", height: 340 },
    { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=70&w=500", height: 280 },
  ],
  notes: [
    { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=70&w=500", height: 260 },
    { url: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=70&w=500", height: 300 },
    { url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=70&w=500", height: 280 },
    { url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=70&w=500", height: 320 },
    { url: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?q=70&w=500", height: 240 },
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
  const ref = useRef<HTMLDivElement>(null);

  const all = useMemo(() => {
    const arr = Object.keys(DATA).reduce<{ url: string; height: number }[]>((acc, key) => {
      return acc.concat(DATA[key].map((item) => item));
    }, []);
    return arr.sort(() => Math.random() - 0.5);
  }, []);

  function setActive(val: TOC_INTERFACE) {
    if (!val.value) _setActive(val);
    setTimeout(() => _setActive(val), 400);
  }

  const filteredData = active.value ? DATA[active.value] : all;

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
                <span className="text-sm font-medium">Home</span>
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold">{folderTitle}</span>
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
                  className="relative mb-4 overflow-hidden rounded-xl break-inside-avoid"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <img
                    src={item.url}
                    className="w-full object-cover rounded-xl"
                    style={{ height: item.height }}
                    alt={`${active.name} item ${idx + 1}`}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Menu */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40">
          <BottomMenu />
        </div>
      </MotionConfig>
    </div>
  );
}
