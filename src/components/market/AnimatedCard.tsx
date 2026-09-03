"use client";

import { motion, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnimatedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "glow";
  delay?: number;
}

const variantStyles = {
  default: "rounded-2xl border bg-card shadow-sm",
  glass: "rounded-2xl border border-border/40 bg-card/60 glass-card shadow-sm",
  glow: "rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-shadow duration-300",
};

export function AnimatedCard({
  children,
  className,
  variant = "default",
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2 }}
      className={cn(variantStyles[variant], "overflow-hidden", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
