import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
};

/**
 * CameraView — requests rear camera via getUserMedia.
 * Falls back to a stylized hospital corridor gradient if denied / unsupported.
 */
export function CameraView({ className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("fallback");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setStatus("ready");
        }
      } catch {
        setStatus("fallback");
      }
    }
    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {status !== "fallback" && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
      )}
      {status === "fallback" && <MockCorridor />}
      {/* darkening overlay so UI stays legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
    </div>
  );
}

function MockCorridor() {
  return (
    <div className="h-full w-full relative">
      {/* perspective hallway */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.18 0.02 240) 0%, oklch(0.22 0.02 240) 40%, oklch(0.14 0.02 240) 100%)",
        }}
      />
      <svg viewBox="0 0 400 800" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.28 0.02 240)" />
            <stop offset="100%" stopColor="oklch(0.12 0.02 240)" />
          </linearGradient>
          <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.2 0.02 240)" />
            <stop offset="50%" stopColor="oklch(0.26 0.02 240)" />
            <stop offset="100%" stopColor="oklch(0.2 0.02 240)" />
          </linearGradient>
        </defs>
        {/* ceiling */}
        <polygon points="0,0 400,0 260,300 140,300" fill="oklch(0.16 0.02 240)" />
        {/* left wall */}
        <polygon points="0,0 140,300 140,500 0,800" fill="url(#wall)" />
        {/* right wall */}
        <polygon points="400,0 260,300 260,500 400,800" fill="url(#wall)" />
        {/* floor */}
        <polygon points="140,500 260,500 400,800 0,800" fill="url(#floor)" />
        {/* doors */}
        <rect x="40" y="340" width="50" height="120" fill="oklch(0.32 0.04 200)" opacity="0.5" />
        <rect x="310" y="340" width="50" height="120" fill="oklch(0.32 0.04 200)" opacity="0.5" />
        {/* ceiling lights */}
        <ellipse cx="200" cy="60" rx="40" ry="6" fill="oklch(0.95 0.05 220)" opacity="0.6" />
        <ellipse cx="200" cy="180" rx="28" ry="4" fill="oklch(0.95 0.05 220)" opacity="0.4" />
      </svg>
    </div>
  );
}
