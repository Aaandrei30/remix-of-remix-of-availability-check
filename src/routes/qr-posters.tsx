import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, ChevronLeft } from "lucide-react";
import { ROOMS } from "@/lib/indoor-rooms";

export const Route = createFileRoute("/qr-posters")({
  head: () => ({
    meta: [
      { title: "Room QR Posters · WayFinder" },
      {
        name: "description",
        content:
          "Printable QR codes to tape at each room. Scanning sets the user's starting location for AR navigation.",
      },
    ],
  }),
  component: QRPostersPage,
});

function QRPostersPage() {
  const [origin, setOrigin] = useState<string>("");
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const r of ROOMS) {
        // Pick any *other* room as a sample destination so the QR alone
        // walks the user straight into a working AR session.
        const dest = ROOMS.find((x) => x.id !== r.id) ?? r;
        const url = `${origin}/navigate-room/${dest.id}?from=${r.id}`;
        next[r.id] = await QRCode.toDataURL(url, {
          width: 512,
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
      }
      if (!cancelled) setQrs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [origin]);

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="no-print sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-5 py-3">
          <Link
            to="/destinations"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
              Printable
            </p>
            <h1 className="font-display text-base font-semibold mt-0.5">
              Room QR posters
            </h1>
          </div>
          <button
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold"
            style={{
              background: "var(--gradient-primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-6">
        <p className="no-print text-sm text-muted-foreground mb-6 leading-relaxed">
          Tape one QR at each room's entrance. When someone scans it, the
          WayFinder app opens already knowing where they are — then they pick
          (or are routed to) a destination and the AR arrow takes them there.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
          {ROOMS.map((r) => (
            <article
              key={r.id}
              className="poster rounded-2xl border border-white/15 bg-white text-black p-5 flex flex-col items-center text-center break-inside-avoid"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Saiz Syete WayFinder
              </p>
              <h2 className="font-display text-2xl font-bold mt-1 leading-tight">
                {r.name}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">{r.floor}</p>
              <div className="mt-4 rounded-xl overflow-hidden">
                {qrs[r.id] ? (
                  <img
                    src={qrs[r.id]}
                    alt={`QR code for ${r.name}`}
                    className="w-44 h-44"
                  />
                ) : (
                  <div className="w-44 h-44 bg-neutral-100 animate-pulse" />
                )}
              </div>
              <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
                Scan to navigate from <strong>{r.name}</strong>
              </p>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { background: white !important; }
          .poster { page-break-inside: avoid; border-color: #e5e5e5 !important; }
        }
      `}</style>
    </main>
  );
}