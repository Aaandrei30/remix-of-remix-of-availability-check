import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, CornerUpLeft, CornerUpRight, CheckCircle2 } from "lucide-react";
import type { Direction } from "@/lib/wayfinder-data";

const ICONS = {
  straight: ArrowUp,
  left: CornerUpLeft,
  right: CornerUpRight,
  arrived: CheckCircle2,
};

export function ArrowOverlay({ direction }: { direction: Direction }) {
  const Icon = ICONS[direction];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={direction}
          initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, rotate: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative"
        >
          {/* glow ring */}
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: "var(--primary)", opacity: 0.45 }}
          />
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, var(--primary-glow), var(--primary))",
              boxShadow:
                "0 0 60px color-mix(in oklab, var(--primary) 80%, transparent), inset 0 -8px 24px color-mix(in oklab, black 30%, transparent)",
              animation:
                direction === "arrived" ? undefined : "pulse-arrow 1.6s ease-in-out infinite",
            }}
          >
            <Icon
              className="h-24 w-24"
              style={{ color: "var(--primary-foreground)" }}
              strokeWidth={2.5}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
