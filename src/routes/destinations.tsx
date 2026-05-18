import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, ChevronRight, Clock, Footprints, Navigation, FlaskConical, DoorOpen } from "lucide-react";
import { NavBar } from "@/components/wayfinder/NavBar";
import { DESTINATIONS, CURRENT_LOCATION } from "@/lib/wayfinder-data";
import { ROOMS } from "@/lib/indoor-rooms";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Choose a destination · Saiz Syete WayFinder" },
      {
        name: "description",
        content:
          "Pick from wards, clinics, diagnostics, amenities and exits to start guided indoor navigation.",
      },
    ],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = DESTINATIONS.filter((d) =>
      (d.name + " " + d.category).toLowerCase().includes(query.toLowerCase())
    );
    const map = new Map<string, typeof DESTINATIONS>();
    for (const d of filtered) {
      const arr = map.get(d.category) ?? [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return Array.from(map.entries());
  }, [query]);

  const indoorRooms = useMemo(() => {
    const q = query.toLowerCase();
    return ROOMS.filter((r) =>
      (r.name + " " + r.floor).toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <main className="min-h-screen pb-10">
      <NavBar title="Destinations" backTo="/" />

      <div className="px-5 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          You are here
        </p>
        <h2 className="font-display text-2xl font-bold mt-1 leading-tight">
          {CURRENT_LOCATION}
        </h2>

        {/* Search */}
        <div className="mt-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wards, clinics, amenities…"
            className="w-full h-12 pl-11 pr-4 rounded-2xl glass text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
      </div>

      <div className="mt-6 px-5 space-y-7">
        {grouped.length === 0 && indoorRooms.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No destinations match "{query}".
          </p>
        )}

        {indoorRooms.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <DoorOpen className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Indoor Rooms · AR Navigation
              </h3>
            </div>
            <ul className="space-y-2">
              {indoorRooms.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                >
                  <Link
                    to="/navigate-room/$roomId"
                    params={{ roomId: r.id }}
                    className="group flex items-center gap-4 p-3.5 rounded-2xl glass hover:bg-white/10 transition-colors active:scale-[0.99]"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "color-mix(in oklab, var(--primary) 20%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <DoorOpen className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] leading-tight truncate">
                        {r.name}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{r.floor}</span>
                        <span>· Camera + compass</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {grouped.map(([category, items]) => (
          <section key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 px-1">
              {category}
            </h3>
            <ul className="space-y-2">
              {items.map((d, i) => {
                const Icon = d.icon;
                return (
                  <motion.li
                    key={d.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <Link
                      to="/navigate/$destinationId"
                      params={{ destinationId: d.id }}
                      className="group flex items-center gap-4 p-3.5 rounded-2xl glass hover:bg-white/10 transition-colors active:scale-[0.99]"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "color-mix(in oklab, var(--primary) 20%, transparent)",
                          color: "var(--primary)",
                        }}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] leading-tight truncate">
                          {d.name}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Footprints className="h-3 w-3" />
                            {d.distance}m
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {d.eta}
                          </span>
                          <span>· {d.level}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Experimental: Outdoor GPS */}
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-2 px-1">
            <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Experimental · Outdoor GPS
            </h3>
          </div>
          <Link
            to="/gps"
            className="group flex items-center gap-4 p-3.5 rounded-2xl glass hover:bg-white/10 transition-colors active:scale-[0.99] border border-dashed border-white/15"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "color-mix(in oklab, var(--primary) 20%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Navigation className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] leading-tight truncate">
                San Pedro Cutud Elementary School
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>Real GPS + compass</span>
                <span>· Outdoors</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground leading-relaxed">
            Base: your house · Destination: school nearby (~60m). Test outside on your phone for best results.
          </p>
        </section>
      </div>
    </main>
  );
}
