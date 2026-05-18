import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Navigation, MapPin, Compass, AlertTriangle } from "lucide-react";
import { CameraView } from "@/components/wayfinder/CameraView";

export const Route = createFileRoute("/gps")({
  head: () => ({
    meta: [
      { title: "Outdoor GPS · Saiz Syete WayFinder" },
      {
        name: "description",
        content:
          "Experimental real-world GPS navigation using device geolocation and compass.",
      },
    ],
  }),
  component: GpsPage,
});

// Real coordinates
const HOME = { lat: 15.018694148543986, lng: 120.69339710995725, label: "Home (Base)" };
const SCHOOL = {
  lat: 15.018199812781752,
  lng: 120.69216723999908,
  label: "San Pedro Cutud Elementary School",
};

// Haversine distance in meters
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Bearing from a to b in degrees (0 = North, clockwise)
function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function GpsPage() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [orientationGranted, setOrientationGranted] = useState<boolean>(false);
  const [useSimulated, setUseSimulated] = useState(false);
  const watchRef = useRef<number | null>(null);

  // Geolocation watcher
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    if (useSimulated) {
      setCoords({ lat: HOME.lat, lng: HOME.lng, acc: 5 });
      setGeoError(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not supported on this device.");
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null); // clear any stale error on every successful fix
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
      },
      (err) => {
        // Only surface error if we don't already have a working fix
        setGeoError((prev) => (coords ? null : err.message));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSimulated, retryNonce]);

  // Device orientation (compass) — true heading, with screen-orientation compensation
  useEffect(() => {
    function getScreenAngle(): number {
      const so = (screen as any).orientation;
      if (so && typeof so.angle === "number") return so.angle;
      if (typeof window.orientation === "number") return window.orientation as number;
      return 0;
    }
    function handler(e: DeviceOrientationEvent) {
      const anyE = e as any;
      let compass: number | null = null;
      if (typeof anyE.webkitCompassHeading === "number") {
        // iOS: already true heading (0=N, clockwise)
        compass = anyE.webkitCompassHeading;
      } else if (e.alpha != null && (e.absolute || (e as any).absolute === undefined)) {
        // Android (absolute): alpha is degrees CCW from north → convert to CW
        compass = 360 - e.alpha;
      }
      if (compass == null) return;
      // Compensate for screen rotation (landscape etc.)
      compass = (compass + getScreenAngle() + 360) % 360;
      setHeading(compass);
    }
    // Prefer absolute event on Android — gives true north
    const absSupported = "ondeviceorientationabsolute" in window;
    const evtName = absSupported ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(evtName as any, handler as any, true);
    return () => window.removeEventListener(evtName as any, handler as any, true);
  }, [orientationGranted]);

  async function requestCompass() {
    const anyDOE = (window as any).DeviceOrientationEvent;
    if (anyDOE && typeof anyDOE.requestPermission === "function") {
      try {
        const res = await anyDOE.requestPermission();
        setOrientationGranted(res === "granted");
      } catch {
        setOrientationGranted(false);
      }
    } else {
      setOrientationGranted(true);
    }
  }

  const here = coords ?? HOME;
  const dist = distanceMeters(here, SCHOOL);
  const bearing = bearingDeg(here, SCHOOL);
  // arrow rotation = bearing - heading (so arrow points toward target relative to where phone faces)
  const arrowRotation = heading != null ? bearing - heading : bearing;
  const arrived = dist < 15;

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
              Outdoor GPS · Experimental
            </p>
            <p className="font-display text-sm font-semibold truncate mt-0.5">
              {SCHOOL.label}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{
              background: "color-mix(in oklab, var(--primary) 22%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Navigation className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* Compass arrow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: arrowRotation }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
          className="relative"
        >
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: "var(--primary)", opacity: 0.5 }}
          />
          <div
            className="relative flex h-48 w-48 items-center justify-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, var(--primary-glow), var(--primary))",
              boxShadow:
                "0 0 60px color-mix(in oklab, var(--primary) 80%, transparent), inset 0 -8px 24px color-mix(in oklab, black 30%, transparent)",
            }}
          >
            <Navigation
              className="h-28 w-28"
              style={{ color: "var(--primary-foreground)", transform: "translateY(-4px)" }}
              strokeWidth={2.4}
              fill="currentColor"
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom info card */}
      <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-6">
        <div className="glass rounded-3xl p-5 space-y-4">
          {arrived ? (
            <div className="text-center py-2">
              <p className="font-display text-2xl font-bold">You've arrived! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">
                Within 15m of {SCHOOL.label}
              </p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Distance
                </p>
                <p className="font-display text-5xl font-bold tabular-nums leading-none mt-1">
                  {dist < 1000 ? Math.round(dist) : (dist / 1000).toFixed(2)}
                  <span className="text-xl text-muted-foreground ml-1">
                    {dist < 1000 ? "m" : "km"}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Bearing
                </p>
                <p className="font-display text-2xl font-bold tabular-nums mt-1">
                  {Math.round(bearing)}°
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" /> You
              </div>
              <p className="font-mono mt-1 text-[11px] truncate">
                {here.lat.toFixed(5)}, {here.lng.toFixed(5)}
              </p>
              {coords && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ±{Math.round(coords.acc)}m
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Compass className="h-3 w-3" /> Heading
              </div>
              <p className="font-mono mt-1 text-[11px]">
                {heading != null ? `${Math.round(heading)}°` : "—"}
              </p>
              {!orientationGranted && (
                <button
                  onClick={requestCompass}
                  className="text-[10px] text-primary underline mt-0.5"
                >
                  Enable compass
                </button>
              )}
            </div>
          </div>

          {geoError && !coords && (
            <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{geoError}</p>
                {typeof window !== "undefined" && window.self !== window.top && (
                  <p className="text-[11px] opacity-90">
                    You're inside the Lovable preview iframe — browsers block GPS here.
                    Open the app in a new tab (or on your phone) to grant location.
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className="text-[11px] underline font-semibold"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => window.open(window.location.href, "_blank")}
                    className="text-[11px] underline font-semibold"
                  >
                    Open in new tab
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setUseSimulated((s) => !s)}
              className="flex-1 h-10 rounded-xl border border-white/15 hover:bg-white/10 transition text-xs font-semibold"
            >
              {useSimulated ? "Use real GPS" : "Simulate from Home"}
            </button>
            <button
              onClick={() => navigate({ to: "/destinations" })}
              className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition text-xs font-semibold"
            >
              Back
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Tip: works best <span className="text-foreground">outdoors</span> with clear sky.
            On iOS, tap "Enable compass" to grant motion permission. The arrow rotates relative
            to where your phone is facing.
          </p>
        </div>
      </div>
    </main>
  );
}
