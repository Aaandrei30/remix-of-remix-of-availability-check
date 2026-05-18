import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X, MapPin, CheckCircle2, RotateCw } from "lucide-react";
import { CameraView } from "@/components/wayfinder/CameraView";
import { ArrowOverlay } from "@/components/wayfinder/ArrowOverlay";
import { getDestination } from "@/lib/wayfinder-data";

export const Route = createFileRoute("/navigate/$destinationId")({
  head: ({ params }) => {
    const dest = getDestination(params.destinationId);
    return {
      meta: [
        {
          title: dest
            ? `Navigating to ${dest.name} · Saiz Syete WayFinder`
            : "Navigating · Saiz Syete WayFinder",
        },
        {
          name: "description",
          content: dest
            ? `Live indoor guidance to ${dest.name} on ${dest.level}.`
            : "Live indoor navigation guidance.",
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Destination not found</h1>
      <Link
        to="/destinations"
        className="mt-4 underline text-primary"
      >
        Back to destinations
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/destinations" className="mt-4 underline text-primary">
        Back to destinations
      </Link>
    </div>
  ),
  component: NavigatePage,
});

const TICK_MS = 220; // simulate ~1m every 220ms ≈ ~4.5 m/s walk (sped-up for demo)

function NavigatePage() {
  const { destinationId } = Route.useParams();
  const dest = getDestination(destinationId);
  const navigate = useNavigate();

  if (!dest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-bold">Destination not found</h1>
        <Link to="/destinations" className="mt-4 underline text-primary">
          Back to destinations
        </Link>
      </div>
    );
  }

  // Build cumulative segment thresholds (meters remaining at the end of each step).
  const { segments, total } = useMemo(() => {
    const segs: { stepIndex: number; remainingAtStart: number; remainingAtEnd: number }[] = [];
    const totalDist = dest.steps.reduce((acc, s) => acc + s.distance, 0);
    let walked = 0;
    dest.steps.forEach((s, i) => {
      const remainingAtStart = totalDist - walked;
      walked += s.distance;
      const remainingAtEnd = totalDist - walked;
      segs.push({ stepIndex: i, remainingAtStart, remainingAtEnd });
    });
    return { segments: segs, total: totalDist };
  }, [dest]);

  const [remaining, setRemaining] = useState(total);
  const [paused, setPaused] = useState(false);
  const [arrived, setArrived] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine current step based on remaining distance.
  const currentStepIndex = useMemo(() => {
    // The active step is the first whose remainingAtEnd <= remaining < remainingAtStart.
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (remaining > s.remainingAtEnd) return i;
    }
    return segments.length - 1;
  }, [remaining, segments]);

  const currentStep = dest.steps[currentStepIndex];
  const nextTurnStep = dest.steps
    .slice(currentStepIndex + 1)
    .find((s) => s.direction !== "straight");
  const distanceToNextTurn = (() => {
    if (!nextTurnStep) return null;
    let d = 0;
    for (let i = currentStepIndex; i < dest.steps.length; i++) {
      if (dest.steps[i] === nextTurnStep) break;
      // distance left in current step + full distances of intermediate steps
      if (i === currentStepIndex) {
        d += Math.max(0, remaining - segments[i].remainingAtEnd);
      } else {
        d += dest.steps[i].distance;
      }
    }
    return Math.max(1, Math.round(d));
  })();

  // tick simulation
  useEffect(() => {
    if (paused || arrived) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0) {
          setArrived(true);
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, arrived]);

  function restart() {
    setRemaining(total);
    setArrived(false);
    setPaused(false);
  }

  const direction = arrived ? "arrived" : currentStep.direction;
  const progress = ((total - remaining) / total) * 100;
  const Icon = dest.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <CameraView />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 pt-4">
        <div className="glass rounded-2xl px-3 py-2.5 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/destinations" })}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
              Navigating to
            </p>
            <p className="font-display text-sm font-semibold truncate mt-0.5">
              {dest.name}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{
              background: "color-mix(in oklab, var(--primary) 22%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-primary)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2, ease: "linear" }}
          />
        </div>
      </div>

      {/* Center arrow */}
      <ArrowOverlay direction={direction} />

      {/* Bottom instruction card */}
      <AnimatePresence mode="wait">
        {!arrived ? (
          <motion.div
            key="nav-card"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="absolute bottom-0 inset-x-0 z-20 px-4 pb-6"
          >
            <div className="glass rounded-3xl p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Remaining
                  </p>
                  <p className="font-display text-5xl font-bold tabular-nums leading-none mt-1">
                    {remaining}
                    <span className="text-xl text-muted-foreground ml-1">m</span>
                  </p>
                </div>
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/15 hover:bg-white/10 transition"
                >
                  {paused ? "Resume" : "Pause"}
                </button>
              </div>

              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-3"
              >
                <MapPin
                  className="h-5 w-5 mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <p className="text-base font-medium leading-snug">
                  {currentStep.instruction}
                </p>
              </motion.div>

              {nextTurnStep && distanceToNextTurn !== null && (
                <p className="mt-3 text-xs text-muted-foreground border-t border-white/10 pt-3">
                  Next: {nextTurnStep.direction === "left" ? "Turn left" : nextTurnStep.direction === "right" ? "Turn right" : "Continue"} in {distanceToNextTurn}m
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="arrived-card"
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute bottom-0 inset-x-0 z-20 px-4 pb-6"
          >
            <div
              className="rounded-3xl p-6 text-center"
              style={{
                background: "var(--gradient-primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <CheckCircle2 className="h-10 w-10 mx-auto" strokeWidth={2.4} />
              <h2 className="font-display text-2xl font-bold mt-2">You've arrived!</h2>
              <p className="text-sm opacity-80 mt-1">
                Welcome to {dest.name}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={restart}
                  className="flex-1 h-12 rounded-2xl bg-black/20 hover:bg-black/30 transition flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <RotateCw className="h-4 w-4" />
                  Restart
                </button>
                <button
                  onClick={() => navigate({ to: "/destinations" })}
                  className="flex-1 h-12 rounded-2xl bg-black/80 text-white hover:bg-black transition flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  New destination
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel button bottom-corner during nav */}
      {!arrived && (
        <button
          onClick={() => navigate({ to: "/destinations" })}
          className="hidden"
          aria-hidden
        >
          <X />
        </button>
      )}
    </main>
  );
}
