import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Upload, MapPin, Eye, EyeOff, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/indoor")({
  head: () => ({
    meta: [
      { title: "Indoor Map — Wayfinder" },
      { name: "description", content: "3D indoor map viewer and room labeling tool." },
    ],
  }),
  component: IndoorPage,
});

const MODEL_URL = "/models/school-2f-3f.glb";
const STORAGE_KEY = "indoor.labels.v1";

type LabelPoint = {
  id: string;
  name: string;
  floor: "2F" | "3F";
  position: [number, number, number];
};

function loadLabels(): LabelPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLabels(labels: LabelPoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
}

function SchoolModel({
  onClickPoint,
  placing,
}: {
  onClickPoint: (p: [number, number, number]) => void;
  placing: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);

  // Apply a clean material so the white mesh reads nicely
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#e8f4ec"),
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
      onClick={(e: any) => {
        if (!placing) return;
        e.stopPropagation();
        const { x, y, z } = e.point;
        onClickPoint([x, y, z]);
      }}
    />
  );
}

function LabelMarkers({
  labels,
  visibleFloor,
  selectedId,
  onSelect,
}: {
  labels: LabelPoint[];
  visibleFloor: "ALL" | "2F" | "3F";
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {labels
        .filter((l) => visibleFloor === "ALL" || l.floor === visibleFloor)
        .map((l) => (
          <group key={l.id} position={l.position}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect(l.id);
              }}
            >
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial
                color={selectedId === l.id ? "#ffffff" : "#5cf2b8"}
                emissive={selectedId === l.id ? "#5cf2b8" : "#2dd4a8"}
                emissiveIntensity={selectedId === l.id ? 2 : 1}
              />
            </mesh>
            <Html distanceFactor={10} position={[0, 0.6, 0]} center>
              <div className="pointer-events-none whitespace-nowrap rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground border border-primary/40 shadow-glow">
                {l.name}
                <span className="ml-1.5 text-[10px] text-muted-foreground">{l.floor}</span>
              </div>
            </Html>
          </group>
        ))}
    </>
  );
}

function CameraResetter({ trigger }: { trigger: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
  }, [trigger, camera]);
  return null;
}

function IndoorPage() {
  const [labels, setLabels] = useState<LabelPoint[]>([]);
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<[number, number, number] | null>(null);
  const [newName, setNewName] = useState("");
  const [newFloor, setNewFloor] = useState<"2F" | "3F">("2F");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleFloor, setVisibleFloor] = useState<"ALL" | "2F" | "3F">("ALL");
  const [resetTrigger, setResetTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabels(loadLabels());
  }, []);

  useEffect(() => {
    saveLabels(labels);
  }, [labels]);

  const handleClickPoint = useCallback((p: [number, number, number]) => {
    setPending(p);
  }, []);

  const confirmLabel = () => {
    if (!pending || !newName.trim()) return;
    const next: LabelPoint = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      floor: newFloor,
      position: pending,
    };
    setLabels((prev) => [...prev, next]);
    setPending(null);
    setNewName("");
    setPlacing(false);
  };

  const cancelPending = () => {
    setPending(null);
    setNewName("");
  };

  const deleteLabel = (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(labels, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "indoor-labels.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) setLabels(parsed);
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight">Indoor Map</h1>
            <p className="text-xs text-muted-foreground">
              {labels.length} room{labels.length === 1 ? "" : "s"} labeled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 rounded-md border border-border p-0.5">
            {(["ALL", "2F", "3F"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVisibleFloor(f)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  visibleFloor === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant={placing ? "default" : "secondary"}
            onClick={() => {
              setPlacing((v) => !v);
              setPending(null);
            }}
          >
            <MapPin className="h-4 w-4 mr-1" />
            {placing ? "Cancel" : "Place"}
          </Button>
        </div>
      </header>

      {/* Mobile floor selector */}
      <div className="sm:hidden flex items-center gap-1 border-b border-border px-4 py-2">
        {(["ALL", "2F", "3F"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setVisibleFloor(f)}
            className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              visibleFloor === f
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-[55vh]">
        <Canvas
          shadows
          camera={{ position: [20, 20, 20], fov: 50 }}
          gl={{ antialias: true }}
          style={{ background: "transparent" }}
        >
          <CameraResetter trigger={resetTrigger} />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <Grid
            args={[100, 100]}
            cellColor="#2a3a4a"
            sectionColor="#3b6fa0"
            sectionThickness={1}
            fadeDistance={60}
            fadeStrength={1.5}
            infiniteGrid
            position={[0, -0.01, 0]}
          />
          <Suspense
            fallback={
              <Html center>
                <div className="rounded-md glass px-3 py-2 text-sm">Loading model…</div>
              </Html>
            }
          >
            <SchoolModel onClickPoint={handleClickPoint} placing={placing} />
            <Environment preset="city" />
          </Suspense>
          <LabelMarkers
            labels={labels}
            visibleFloor={visibleFloor}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {pending && (
            <mesh position={pending}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial
                color="#ffe066"
                emissive="#ffae00"
                emissiveIntensity={2}
              />
            </mesh>
          )}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={120}
          />
        </Canvas>

        {/* Placing hint */}
        {placing && !pending && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <div className="glass rounded-full px-4 py-1.5 text-xs font-medium animate-fade-in">
              Tap a spot on the model to place a label
            </div>
          </div>
        )}

        {/* Pending label form */}
        {pending && (
          <Card className="absolute inset-x-3 bottom-3 sm:left-1/2 sm:right-auto sm:bottom-4 sm:-translate-x-1/2 sm:w-96 p-4 glass border-primary/40 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Label this spot</span>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="room-name" className="text-xs">Room name</Label>
                <Input
                  id="room-name"
                  autoFocus
                  placeholder="e.g. Room 201, Library, Faculty Office"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmLabel()}
                />
              </div>
              <div>
                <Label className="text-xs">Floor</Label>
                <div className="mt-1 flex gap-1">
                  {(["2F", "3F"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNewFloor(f)}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        newFloor === f
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="flex-1" onClick={cancelPending}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={confirmLabel} disabled={!newName.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Label list */}
      <section className="border-t border-border bg-card/40">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-sm font-semibold">Labeled Rooms</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setResetTrigger((n) => n + 1)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Reset view
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={importJson}
            />
            <Button size="sm" variant="ghost" onClick={exportJson} disabled={!labels.length}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto px-4 pb-4">
          {labels.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No rooms yet. Hit <span className="text-foreground font-medium">Place</span> and tap the model to start labeling.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {labels
                .filter((l) => visibleFloor === "ALL" || l.floor === visibleFloor)
                .map((l) => (
                  <li
                    key={l.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                      selectedId === l.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedId(l.id)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{l.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{l.floor}</Badge>
                    </button>
                    <button
                      onClick={() => deleteLabel(l.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Delete label"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
