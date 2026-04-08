"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface ScrollIndicatorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ScrollIndicator({ containerRef }: ScrollIndicatorProps) {
  const sp = useMotionValue(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const c = containerRef?.current || window;

    const update = () => {
      const scrollTop =
        c === window ? window.scrollY : (c as HTMLElement).scrollTop;
      const scrollHeight =
        c === window ? document.body.scrollHeight : (c as HTMLElement).scrollHeight;
      const clientHeight =
        c === window ? window.innerHeight : (c as HTMLElement).clientHeight;
      const progress = scrollHeight === clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight) || 0;
      sp.set(progress);
      setPct(Math.round(progress * 100));
    };

    update();
    c.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    if (c !== window) ro.observe(c as Element);
    return () => {
      c.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [containerRef, sp]);

  const circum = 2 * Math.PI * 10 - 0.5;
  const dash = useTransform(sp, [0, 1], [circum, 0]);
  const sDash = useSpring(dash, { visualDuration: 0.1, bounce: 0 });

  return (
    <div className="flex items-center gap-3 rounded-full bg-black px-4 py-2 text-white/80">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" className="stroke-white/20" strokeWidth="4" fill="none" />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          className="stroke-white/80"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circum}
          strokeDashoffset={sDash}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="text-sm font-bold tabular-nums">{pct}%</span>
    </div>
  );
}
