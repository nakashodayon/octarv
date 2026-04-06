"use client";

import { cva } from "class-variance-authority";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  type MotionProps,
  type Transition,
  type HTMLMotionProps,
} from "framer-motion";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ButtonProps {
  variant?: "loading" | "error" | "success";
  children: React.ReactNode;
  icon?: React.ReactNode;
  transition?: Transition;
  className?: string;
  text?: {
    error?: string;
    loading?: string;
    success?: string;
  };
}

const tAni: MotionProps = {
  variants: {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40, filter: "blur(4px)" },
  },
  initial: "initial",
  animate: "animate",
  exit: "exit",
};

const iAni: MotionProps = {
  variants: {
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0 },
  },
  initial: "initial",
  animate: "animate",
  exit: "exit",
};

const buttonStyles = cva(
  "relative flex h-12 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden px-6 text-center text-base font-bold text-nowrap transition-colors duration-500 select-none",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        loading: "bg-sky-500 text-white",
        error: "bg-rose-500 text-white",
        success: "bg-green-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const FamilyButton = ({
  variant,
  text: _text,
  children,
  icon,
  className,
  transition = { type: "spring", duration: 0.6, bounce: 0.4 },
  ...rest
}: ButtonProps & HTMLMotionProps<"button">) => {
  const text = {
    success: "Success",
    loading: "Loading...",
    error: "Error",
    ..._text,
  };

  function renderIcon() {
    if (variant === "loading") {
      return (
        <div>
          <svg
            className="size-5"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              className="stroke-white/30"
              strokeWidth="4"
              fill="none"
            ></circle>
            <motion.circle
              cx="12"
              cy="12"
              r="10"
              className="stroke-white"
              strokeWidth="4"
              fill="none"
              strokeDasharray="62.33185307179586"
              strokeDashoffset="43.66456772333291"
              strokeLinecap="round"
              animate={{
                rotate: [0, 360 * 3],
                transition: {
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
            ></motion.circle>
          </svg>
        </div>
      );
    } else if (variant === "error") {
      return (
        <motion.div
          animate={{
            x: [0, 6, -6, 0, 6, -6, 0, 6, -6, 0],
            transition: {
              duration: 0.4,
              repeat: Infinity,
              repeatType: "loop",
              repeatDelay: 1.2,
            },
          }}
        >
          <AlertTriangle className="size-5" />
        </motion.div>
      );
    } else if (variant === "success") {
      return <CheckCircle className="size-5" />;
    } else return icon;
  }

  function renderTxt() {
    if (variant === "loading") return text.loading;
    else if (variant === "error") return text.error;
    else if (variant === "success") return text.success;
    return children;
  }

  return (
    <MotionConfig transition={transition}>
      <motion.button
        {...rest}
        className={buttonStyles({ variant, className })}
        style={{ borderRadius: 100 }}
        layout
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {(variant || icon) && (
            <motion.div key={`${variant}-icon`} {...iAni} layout="position">
              {renderIcon()}
            </motion.div>
          )}
          <motion.div key={`${variant}-text`} {...tAni} layout="position">
            {renderTxt()}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </MotionConfig>
  );
};

export default FamilyButton;
