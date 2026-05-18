import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Compass, MapPin, RotateCw, Crosshair, ArrowUpFromLine } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { CameraView } from "@/components/wayfinder/CameraView";
import { ARCompassArrow } from "@/components/wayfinder/ARCompassArrow";
import {
  ROOMS,
  getRoom,
  bearingXZ,
  distanceXZ,
  shortestAngle,
  directionLabel,
  DEFAULT_START_ID,
} from "@/lib/indoor-rooms";

const LS_KEY = "wayfinder.lastStartRoomId";

const searchSchema = z.object({
  from: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/navigate-room/$roomId")({
  validateSearch: zodValidator(searchSchema),
  head: ({ params }) => {
    const room = getRoom(params.roomId);
    return {
      meta: [
        {
          title: room
            ? `Navigating to ${room.name} · WayFinder`
            : "Navigating · WayFinder",
        },
        {
          name: "description",
          content: room
            ? `AR walking guidance to ${room.name} on ${room.floor}.`
            : "AR indoor navigation guidance.",
        },
      ],
    };
  },
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/destinations" className="mt-4 underline text-primary">
        Back to destinations
      </Link>
    </div>
  ),
  component: NavigateRoomPage,
});

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Room not found</h1>
      <Link to="/destinations" className="mt-4 underline text-primary">
        Back to destinations
      </Link>
    </div>
  );
}

const ARRIVAL_THRESHOLD_M = 2.5;

function NavigateRoomPage() {
  const { roomId } = Route.useParams();
  const { from } = Route.useSearch();
  const target = getRoom(roomId);
  const navigate = useNavigate();

  // Priority: ?from= (QR scan) → localStorage → default.
  const initialStartId = (() => {
    if (from && getRoom(from)) return from;
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(LS_KEY);
      if (saved && getRoom(saved)) return saved;
    }
    return DEFAULT_START_ID;
  })();

  const [startId, setStartId] = useState<string>(initialStartId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  // For multi-floor routing: once user reaches the stairs and goes up,
  // they tap "I'm on the next floor" and we switch the waypoint off.
  const [stairsCleared, setStairsCleared] = useState(false);

  // Sync ?from= when it changes (e.g. user scans a new QR mid-session).
  useEffect(() => {
    if (from && getRoom(from) && from !== startId) {
      setStartId(from);
      setStairsCleared(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  // Persist whenever start changes.
  useEffect(() => {
    if (typeof window !== "undefined" && startId) {
      window.localStorage.setItem(LS_KEY, startId);
    }
  }, [startId]);

  // iOS 13+ needs an explicit permission gesture for DeviceOrientationEvent.
  useEffect(() => {
    const AnyDOE = (window as any).DeviceOrientationEvent;
    if (AnyDOE && typeof AnyDOE.requestPermission === "function") {
      setNeedsPermission(true);
    } else {
      attachOrientation();
    }
    return () => detachOrientation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOrientation(e: DeviceOrientationEvent) {
    // iOS gives a true compass heading via webkitCompassHeading.
    const iosHeading = (e as any).webkitCompassHeading as number | undefined;
    if (typeof iosHeading === "number") {
      setHeading(iosHeading);
      return;
    }
    if (typeof e.alpha === "number") {
      // Approximate compass heading from alpha (0 = device facing north).
      setHeading((360 - e.alpha) % 360);
    }
  }

  function attachOrientation() {
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener, true);
    window.addEventListener("deviceorientation", onOrientation, true);
  }
  function detachOrientation() {
    window.removeEventListener(
      "deviceorientationabsolute",
      onOrientation as EventListener,
      true,
    );
    window.removeEventListener("deviceorientation", onOrientation, true);
  }

  async function requestCompass() {
    const AnyDOE = (window as any).DeviceOrientationEvent;
    try {
      const res = await AnyDOE.requestPermission();
      if (res === "granted") {
        setNeedsPermission(false);
        attachOrientation();
      }
    } catch {
      // ignore
    }
  }

  const start = getRoom(startId) ?? ROOMS[0];
  const safeTarget = target ?? ROOMS[0];

  // Find stairs waypoint (model only has one stairs anchor).
  const stairs = useMemo(() => ROOMS.find((r) => /stair/i.test(r.name)), []);
  const sameFloor = start.floor === safeTarget.floor;
  // Leg 1 = head to stairs. Leg 2 = stairs → destination on target floor.
  const useStairsLeg = !sameFloor && !!stairs && !stairsCleared;
  const waypoint = useStairsLeg ? stairs! : safeTarget;

  const targetBearing = useMemo(
    () => bearingXZ(start.position, waypoint.position),
    [start, waypoint],
  );
  const dist = useMemo(
    () => distanceXZ(start.position, waypoint.position),
    [start, waypoint],
  );

  if (!target) return <NotFound />;
  const reachedWaypoint = dist < ARRIVAL_THRESHOLD_M;
  const arrived = reachedWaypoint && !useStairsLeg;
  const atStairs = reachedWaypoint && useStairsLeg;

  // Rotation to apply to the arrow: positive = clockwise (right).
  // If we have a heading, rotate relative to where the phone is pointing;
  // otherwise just show the absolute bearing so the arrow still updates
  // when the user changes their "I'm at" room.
  const relative = heading == null
    ? targetBearing
    : shortestAngle(targetBearing - heading);

  function goUpstairs() {
    if (!stairs) return;
    setStartId(stairs.id);
    setStairsCleared(true);
  }

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
              {useStairsLeg
                ? `Step 1 of 2 · via stairs to ${target.floor}`
                : `Heading to · ${target.floor}`}
            </p>
            <p className="font-display text-sm font-semibold truncate mt-0.5">
              {useStairsLeg ? `Stairs → ${target.name}` : target.name}
            </p>
          </div>
          <div
            className="flex h-9 px-2.5 items-center justify-center rounded-xl shrink-0 gap-1.5 text-xs font-medium"
            style={{
              background: "color-mix(in oklab, var(--primary) 22%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Compass className="h-4 w-4" strokeWidth={2.2} />
            {heading == null ? "—°" : `${Math.round(heading)}°`}
          </div>
        </div>
      </div>

      <ARCompassArrow rotation={relative} arrived={arrived} />

      {/* iOS compass permission overlay */}
      {needsPermission && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 px-6">
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm">Enable motion & orientation so the arrow can point you the right way.</p>
            <button
              onClick={requestCompass}
              className="mt-3 h-11 w-full rounded-xl font-display font-semibold"
              style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}
            >
              Enable compass
            </button>
          </div>
        </div>
      )}

      {/* Bottom instruction card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={arrived ? "arrived" : "nav"}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="absolute bottom-0 inset-x-0 z-20 px-4 pb-6"
        >
          {arrived ? (
            <div
              className="rounded-3xl p-6 text-center"
              style={{
                background: "var(--gradient-primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <h2 className="font-display text-2xl font-bold">You've arrived!</h2>
              <p className="text-sm opacity-80 mt-1">Welcome to {target.name}</p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex-1 h-12 rounded-2xl bg-black/20 hover:bg-black/30 transition flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <RotateCw className="h-4 w-4" /> Change start
                </button>
                <button
                  onClick={() => navigate({ to: "/destinations" })}
                  className="flex-1 h-12 rounded-2xl bg-black/80 text-white hover:bg-black transition flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  New destination
                </button>
              </div>
            </div>
          ) : atStairs ? (
            <div
              className="rounded-3xl p-6 text-center"
              style={{
                background: "var(--gradient-primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <h2 className="font-display text-xl font-bold">You're at the stairs</h2>
              <p className="text-sm opacity-80 mt-1">
                Go up to {target.floor}, then tap below to continue.
              </p>
              <button
                onClick={goUpstairs}
                className="mt-5 h-12 w-full rounded-2xl bg-black/80 text-white hover:bg-black transition flex items-center justify-center gap-2 font-semibold text-sm"
              >
                <ArrowUpFromLine className="h-4 w-4" /> I'm on {target.floor}
              </button>
            </div>
          ) : (
            <div className="glass rounded-3xl p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {useStairsLeg ? "To stairs" : "Distance"}
                  </p>
                  <p className="font-display text-5xl font-bold tabular-nums leading-none mt-1">
                    {Math.round(dist)}
                    <span className="text-xl text-muted-foreground ml-1">m</span>
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/15 hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  I'm at: {start.name}
                </button>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <MapPin
                  className="h-5 w-5 mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <p className="text-base font-medium leading-snug">
                  {directionLabel(relative)}
                  {useStairsLeg && (
                    <>
                      {" "}
                      · to the stairs, then up to{" "}
                      <span style={{ color: "var(--primary)" }}>{target.floor}</span>
                    </>
                  )}
                </p>
              </div>

              {useStairsLeg && (
                <button
                  onClick={goUpstairs}
                  className="mt-3 w-full text-xs px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  Skip — I'm already on {target.floor}
                </button>
              )}

              {heading == null && !needsPermission && (
                <p className="mt-3 text-[11px] text-muted-foreground border-t border-white/10 pt-3">
                  Compass unavailable on this device — arrow shows absolute bearing only.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Start room picker */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl glass p-5 max-h-[70vh] overflow-y-auto"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                I'm currently at
              </p>
              <ul className="space-y-1.5">
                {ROOMS.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => {
                        setStartId(r.id);
                        setPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        startId === r.id
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-white/10"
                      }`}
                      disabled={r.id === target.id}
                    >
                      <span className="truncate">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">{r.floor}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}