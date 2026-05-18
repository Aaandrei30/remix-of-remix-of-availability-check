import { motion } from "framer-motion";
import { ArrowUp, CheckCircle2 } from "lucide-react";

type Props = {
  /** Rotation in degrees: 0 = target straight ahead, +90 = to the right. */
  rotation: number;
  arrived: boolean;
};

/**
 * AR-style arrow that rotates to point toward the target relative to the
 * device's current compass heading.
 */
export function ARCompassArrow({ rotation, arrived }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        animate={{ rotate: arrived ? 0 : rotation }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative"
      >
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
            animation: arrived ? undefined : "pulse-arrow 1.6s ease-in-out infinite",
          }}
        >
          {arrived ? (
            <CheckCircle2
              className="h-24 w-24"
              style={{ color: "var(--primary-foreground)" }}
              strokeWidth={2.5}
            />
          ) : (
            <ArrowUp
              className="h-24 w-24"
              style={{ color: "var(--primary-foreground)" }}
              strokeWidth={2.5}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}