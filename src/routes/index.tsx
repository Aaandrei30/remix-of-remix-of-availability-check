import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { QrCode, MapPin, Sparkles } from "lucide-react";
import { FACILITY_NAME, CURRENT_LOCATION } from "@/lib/wayfinder-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saiz Syete WayFinder — Indoor Navigation" },
      {
        name: "description",
        content:
          "Scan, pick a destination, and follow simple visual guidance through Saiz Syete Medical Centre.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  return (
    <main className="relative min-h-screen flex flex-col px-6 pb-10 pt-12 overflow-hidden">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--primary)", opacity: 0.18 }}
      />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Saiz Syete · WayFinder
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight"
      >
        Find your way<br />
        <span style={{
          background: "var(--gradient-primary)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>inside the hospital.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-4 text-base text-muted-foreground max-w-sm"
      >
        Scan the QR code at any signpost to start. We'll guide you with a live arrow over your camera view.
      </motion.p>

      {/* Scanner mock */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="relative mx-auto mt-10 aspect-square w-64 rounded-3xl glass overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <QrCode className="h-40 w-40 text-foreground/30" strokeWidth={1.2} />
        </div>
        {/* corners */}
        {[
          "top-3 left-3 border-t-2 border-l-2",
          "top-3 right-3 border-t-2 border-r-2",
          "bottom-3 left-3 border-b-2 border-l-2",
          "bottom-3 right-3 border-b-2 border-r-2",
        ].map((c) => (
          <span
            key={c}
            className={`absolute h-8 w-8 rounded-md ${c}`}
            style={{ borderColor: "var(--primary)" }}
          />
        ))}
        {/* scan line */}
        <div
          className="absolute left-4 right-4 h-[2px] rounded-full"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 0 20px var(--primary)",
            animation: "scan 2.4s linear infinite",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <MapPin className="h-4 w-4 text-primary" />
        Detected: <span className="text-foreground font-medium">{CURRENT_LOCATION}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-auto pt-10"
      >
        <Link
          to="/destinations"
          className="group relative flex h-14 w-full items-center justify-center rounded-2xl font-display text-base font-semibold transition-transform active:scale-[0.98] glow-strong"
          style={{
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Continue to Destinations
        </Link>
        <Link
          to="/indoor"
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-primary/40 font-display text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Open Indoor Map (3D)
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {FACILITY_NAME}
        </p>
      </motion.div>
    </main>
  );
}
