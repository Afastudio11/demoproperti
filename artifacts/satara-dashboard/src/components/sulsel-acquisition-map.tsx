import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { useListLandProspects } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import { MapPin, SquareDashed, PenLine, Trash2, X, Loader2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  green: "#16a34a",
  yellow: "#d97706",
  red: "#dc2626",
  default: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  prospek_baru: "Prospek Baru",
  survey: "Survey Lokasi",
  analisis_kompetitor: "Analisis Kompetitor",
  negosiasi: "Negosiasi",
  legal_checking: "Legal Checking",
  pks_mou: "PKS / MoU",
  ditolak: "Ditolak",
};

const SULSEL_CENTER: [number, number] = [-4.5, 120.5];

const TILE_LAYERS = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, Maxar, GeoEye, Earthstar Geographics",
  },
  topo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS",
  },
  satLabel: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Labels &copy; Esri",
  },
} as const;

type LayerKey = "satellite" | "topo";

// Batas wilayah Sulawesi Selatan
const SULSEL_BOUNDS: L.LatLngBoundsExpression = [
  [-7.5, 118.0],  // SW
  [-1.0, 123.5],  // NE
];

function createPinIcon(color: string, active = false) {
  const s = active ? 34 : 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${s}" height="${Math.round(s * 1.5)}">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [s, Math.round(s * 1.5)], iconAnchor: [s / 2, Math.round(s * 1.5)], popupAnchor: [0, -Math.round(s * 1.5)] });
}

function createDraftIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#7c3aed" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="6" fill="white" opacity="0.9"/>
    <text x="12" y="16" text-anchor="middle" font-size="11" fill="#7c3aed" font-weight="bold">+</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [32, 48], iconAnchor: [16, 48], popupAnchor: [0, -48] });
}

function formatLuas(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(2)} Ha` : `${n.toLocaleString("id-ID")} m²`;
}
function formatRp(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

function calcArea(coords: [number, number][]): number {
  const R = 6371000;
  const n = coords.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const d = ((coords[j][1] - coords[i][1]) * Math.PI) / 180;
    area += d * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return (Math.abs(area) * R * R) / 2;
}

const HOUSE_SIZE_M2 = 100; // 10x10 m per rumah
const PUBLIC_FACTOR = 0.4; // 40% untuk fasilitas publik

function calcHouseCapacity(areaSqm: number) {
  const usable = areaSqm * (1 - PUBLIC_FACTOR);
  const units = Math.floor(usable / HOUSE_SIZE_M2);
  return { usable, units };
}

function centroid(coords: [number, number][]): [number, number] {
  return [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "Accept-Language": "id" } }
    );
    const d = await r.json();
    const a = d.address || {};
    return {
      lokasi: d.display_name?.split(",").slice(0, 3).join(", ") ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      kelurahan: a.village || a.suburb || a.neighbourhood || "",
      kecamatan: a.city_district || a.district || a.county || "",
      kabupaten: a.city || a.county || a.regency || "",
    };
  } catch {
    return { lokasi: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kelurahan: "", kecamatan: "", kabupaten: "" };
  }
}

function parseCoords(str: string | null | undefined): [number, number][] | null {
  if (!str) return null;
  try { return JSON.parse(str) as [number, number][]; } catch { return null; }
}

interface DrawnPoly {
  coords: [number, number][];
  area: number;
  center: [number, number];
  geoStr: string;
  lokasi: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
}

interface DraftPin {
  lat: number; lng: number;
  lokasi: string; kelurahan: string; kecamatan: string; kabupaten: string;
  loading: boolean;
}

interface FormState {
  lokasi: string; luas: string; hargaM2: string; roi: string; aksesJalan: string;
}

function GeomanControl({ drawMode, onCreated, onDisable }: {
  drawMode: boolean;
  onCreated: (p: DrawnPoly) => void;
  onDisable: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map.pm) return;
    const handle = async (e: any) => {
      const layer = e.layer as L.Polygon;
      const raw = layer.getLatLngs()[0] as L.LatLng[];
      const coords: [number, number][] = raw.map((ll) => [ll.lat, ll.lng]);
      const area = calcArea(coords);
      const center = centroid(coords);
      map.removeLayer(layer);
      const geo = await reverseGeocode(center[0], center[1]);
      onCreated({ coords, area, center, geoStr: JSON.stringify(coords), ...geo });
      map.pm.disableDraw("Polygon");
      onDisable();
    };
    map.on("pm:create", handle);
    return () => { map.off("pm:create", handle); };
  }, [map, onCreated, onDisable]);

  useEffect(() => {
    if (!map.pm) return;
    if (drawMode) {
      map.pm.enableDraw("Polygon", { snappable: true, allowSelfIntersection: false, finishOn: "dblclick" });
    } else {
      map.pm.disableDraw("Polygon");
    }
  }, [map, drawMode]);

  return null;
}

function ClickHandler({ active, onClickMap }: { active: boolean; onClickMap: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { if (active) onClickMap(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function ProspectMarker({ p, selected, onSelect, onDeselect }: {
  p: LandProspect; selected: boolean;
  onSelect: () => void; onDeselect: () => void;
}) {
  const color = RISK_COLORS[p.riskLevel ?? "default"] ?? RISK_COLORS.default;
  const polyCoords = parseCoords(p.polygonCoords);
  const area = polyCoords ? calcArea(polyCoords) : p.luas;

  const popupContent = (
    <div style={{ fontFamily: "inherit", minWidth: 230 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.lokasi}</div>
      {(p.kelurahan || p.kecamatan) && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          {[p.kelurahan, p.kecamatan, p.kabupaten].filter(Boolean).join(", ")}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
        {[
          { label: "Luas", value: formatLuas(area) },
          { label: "Harga/m²", value: formatRp(p.hargaM2) },
          { label: "ROI", value: `${p.roi}%`, hi: p.roi >= 25 },
          { label: "Akses Jalan", value: p.aksesJalan ? `${p.aksesJalan} m` : "-" },
          { label: "Status", value: STATUS_LABELS[p.status] ?? p.status },
          { label: "Batas", value: polyCoords ? `Polygon ${polyCoords.length} titik` : "Titik pin" },
        ].map(({ label, value, hi }) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: 5, padding: "3px 7px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: hi ? "#16a34a" : "#111827" }}>{value}</div>
          </div>
        ))}
      </div>
      <span style={{ background: color + "20", color, border: `1px solid ${color}44`, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
        {p.riskLevel === "green" ? "Risiko Rendah" : p.riskLevel === "yellow" ? "Risiko Sedang" : p.riskLevel === "red" ? "Risiko Tinggi" : "Belum Dinilai"}
      </span>
    </div>
  );

  return (
    <>
      {polyCoords && (
        <Polygon
          positions={polyCoords}
          pathOptions={{ color, fillColor: color, fillOpacity: selected ? 0.35 : 0.18, weight: selected ? 3 : 2 }}
          eventHandlers={{ click: onSelect }}
        >
          <Popup onClose={onDeselect} maxWidth={280}>{popupContent}</Popup>
        </Polygon>
      )}
      {p.lat != null && p.lng != null && (
        <Marker
          position={[p.lat, p.lng]}
          icon={createPinIcon(color, selected)}
          eventHandlers={{ click: onSelect }}
        >
          <Popup onOpen={onSelect} onClose={onDeselect} maxWidth={280}>{popupContent}</Popup>
        </Marker>
      )}
    </>
  );
}

function HouseCapacityCard({ areaSqm }: { areaSqm: number }) {
  const { usable, units } = calcHouseCapacity(areaSqm);
  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Home className="size-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] font-semibold text-amber-700">Estimasi Kapasitas Rumah</span>
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold text-amber-700 leading-none">{units.toLocaleString("id-ID")}</span>
        <span className="text-[11px] text-amber-600 mb-0.5">unit</span>
      </div>
      <div className="space-y-1 text-[10px] text-amber-600 mt-2 border-t border-amber-200 pt-2">
        <div className="flex justify-between">
          <span>Ukuran per rumah</span>
          <span className="font-medium">10 × 10 m</span>
        </div>
        <div className="flex justify-between">
          <span>Area publik (40%)</span>
          <span className="font-medium">{formatLuas(areaSqm * PUBLIC_FACTOR)}</span>
        </div>
        <div className="flex justify-between">
          <span>Area efektif (60%)</span>
          <span className="font-medium text-amber-700">{formatLuas(usable)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SulselAcquisitionMap() {
  const { data: prospects, refetch } = useListLandProspects({});
  const [layer, setLayer] = useState<LayerKey>("satellite");
  const [showLabel, setShowLabel] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [drawn, setDrawn] = useState<DrawnPoly | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ lokasi: "", luas: "", hargaM2: "", roi: "", aksesJalan: "" });

  const placedCount = (prospects ?? []).filter((p) => p.lat != null || p.polygonCoords).length;
  const unplacedCount = (prospects ?? []).length - placedCount;

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setDraft({ lat, lng, lokasi: "", kelurahan: "", kecamatan: "", kabupaten: "", loading: true });
    const geo = await reverseGeocode(lat, lng);
    setDraft({ lat, lng, ...geo, loading: false });
    setForm((f) => ({ ...f, lokasi: geo.lokasi }));
  }, []);

  const handleDrawCreated = useCallback((poly: DrawnPoly) => {
    setDrawn(poly);
    setForm((f) => ({ ...f, lokasi: poly.lokasi || poly.kecamatan || "", luas: Math.round(poly.area).toString() }));
  }, []);

  const cancelAll = useCallback(() => {
    setAddMode(false);
    setDrawMode(false);
    setDraft(null);
    setDrawn(null);
    setForm({ lokasi: "", luas: "", hargaM2: "", roi: "", aksesJalan: "" });
  }, []);

  const handleSave = async (source: "pin" | "poly") => {
    setSaving(true);
    try {
      const base = {
        status: "prospek_baru" as const,
        lokasi: form.lokasi,
        luas: parseFloat(form.luas),
        hargaM2: parseFloat(form.hargaM2),
        roi: parseFloat(form.roi) || 0,
        aksesJalan: parseFloat(form.aksesJalan) || undefined,
      };
      const extra = source === "pin" && draft
        ? { lat: draft.lat, lng: draft.lng, kelurahan: draft.kelurahan, kecamatan: draft.kecamatan, kabupaten: draft.kabupaten }
        : drawn
        ? { lat: drawn.center[0], lng: drawn.center[1], kelurahan: drawn.kelurahan, kecamatan: drawn.kecamatan, kabupaten: drawn.kabupaten, polygonCoords: drawn.geoStr }
        : {};
      const r = await fetch("/api/land-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, ...extra }),
      });
      if (r.ok) { cancelAll(); refetch(); }
    } finally {
      setSaving(false);
    }
  };

  const tile = TILE_LAYERS[layer];
  const isActive = addMode || drawMode || draft || drawn;

  const selectedProspect = selectedId ? (prospects ?? []).find((p) => p.id === selectedId) : null;
  const selectedPolyCoords = selectedProspect ? parseCoords(selectedProspect.polygonCoords) : null;
  const selectedArea = selectedPolyCoords ? calcArea(selectedPolyCoords) : selectedProspect?.luas ?? 0;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            <span>{placedCount} dipetakan</span>
          </div>
          {unplacedCount > 0 && <span className="text-amber-600 font-medium">{unplacedCount} belum dipetakan</span>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border bg-muted p-0.5 text-[11px] font-medium">
            {(["satellite", "topo"] as LayerKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setLayer(k)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  layer === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {k === "satellite" ? "Satelit" : "Topo"}
              </button>
            ))}
          </div>
          {layer === "satellite" && (
            <button
              onClick={() => setShowLabel((v) => !v)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-lg border transition-colors",
                showLabel ? "bg-blue-600 text-white border-blue-600" : "bg-card text-muted-foreground border-border"
              )}
            >
              Label
            </button>
          )}

          {isActive ? (
            <button onClick={cancelAll} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-card text-muted-foreground hover:text-foreground">
              <X className="size-3.5" /> Batal
            </button>
          ) : (
            <>
              <button
                onClick={() => { setAddMode(true); setDrawMode(false); }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-card hover:bg-muted"
              >
                <MapPin className="size-3.5" /> Tandai Titik
              </button>
              <button
                onClick={() => { setDrawMode(true); setAddMode(false); setDraft(null); }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 border border-violet-600"
              >
                <PenLine className="size-3.5" /> Gambar Lahan
              </button>
            </>
          )}
        </div>
      </div>

      {drawMode && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-xs text-violet-700 flex items-center gap-2">
          <PenLine className="size-3.5 shrink-0" />
          <span>Klik peta untuk menggambar titik sudut batas lahan. <strong>Double-klik</strong> di titik terakhir untuk menutup dan menghitung luas otomatis.</span>
        </div>
      )}
      {addMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0" />
          <span>Klik di peta untuk menandai lokasi lahan dengan pentul. Alamat desa/kecamatan terisi otomatis.</span>
        </div>
      )}

      <div className="flex gap-3 flex-1 min-h-0">
        <div
          className={cn(
            "flex-1 rounded-xl overflow-hidden border relative",
            drawMode && "ring-2 ring-violet-400",
            addMode && "ring-2 ring-blue-400"
          )}
          style={{ minHeight: 460 }}
        >
          <MapContainer
            center={SULSEL_CENTER}
            zoom={8}
            minZoom={7}
            maxZoom={19}
            maxBounds={SULSEL_BOUNDS}
            maxBoundsViscosity={1.0}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={19} />
            {layer === "satellite" && showLabel && (
              <TileLayer url={TILE_LAYERS.satLabel.url} attribution={TILE_LAYERS.satLabel.attribution} maxZoom={19} opacity={0.85} />
            )}

            <GeomanControl drawMode={drawMode} onCreated={handleDrawCreated} onDisable={() => setDrawMode(false)} />
            <ClickHandler active={addMode && !drawMode} onClickMap={handleMapClick} />

            {(prospects ?? []).map((p) => (
              <ProspectMarker
                key={p.id}
                p={p}
                selected={selectedId === p.id}
                onSelect={() => setSelectedId(p.id)}
                onDeselect={() => setSelectedId(null)}
              />
            ))}

            {drawn && (
              <Polygon
                positions={drawn.coords}
                pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.18, weight: 2.5, dashArray: "7 4" }}
              />
            )}

            {draft && !drawMode && (
              <Marker position={[draft.lat, draft.lng]} icon={createDraftIcon()}>
                <Popup maxWidth={270} minWidth={240}>
                  {draft.loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <Loader2 className="size-4 animate-spin" />
                      <span style={{ fontSize: 12 }}>Mencari alamat...</span>
                    </div>
                  ) : (
                    <ProspectForm
                      title="📍 Tambah Prospek Baru"
                      subLabel={[draft.kelurahan, draft.kecamatan, draft.kabupaten].filter(Boolean).join(", ")}
                      form={form} setForm={setForm}
                      onSave={() => handleSave("pin")}
                      onCancel={() => setDraft(null)}
                      saving={saving}
                    />
                  )}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {drawn && (
          <div className="w-60 shrink-0 bg-card border rounded-xl p-4 flex flex-col gap-3 self-start">
            <div className="flex items-center gap-2">
              <PenLine className="size-4 text-violet-500" />
              <span className="text-xs font-semibold flex-1">Lahan Tergambar</span>
              <button onClick={cancelAll} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-violet-700">{formatLuas(drawn.area)}</div>
              <div className="text-[11px] text-violet-500 mt-1">luas terhitung otomatis</div>
            </div>
            <HouseCapacityCard areaSqm={drawn.area} />
            {drawn.kecamatan && (
              <div className="text-[11px] text-muted-foreground">
                📍 {[drawn.kelurahan, drawn.kecamatan, drawn.kabupaten].filter(Boolean).join(", ")}
              </div>
            )}
            <ProspectForm
              form={form} setForm={setForm}
              onSave={() => handleSave("poly")}
              onCancel={cancelAll}
              saving={saving}
              compact
            />
          </div>
        )}

        {selectedProspect && !drawn && (
          <div className="w-52 shrink-0 bg-card border rounded-xl p-4 flex flex-col gap-3 self-start">
            <div className="flex items-center gap-2">
              <SquareDashed className="size-4 text-blue-500" />
              <span className="text-xs font-semibold truncate flex-1">{selectedProspect.lokasi.split(",")[0]}</span>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{formatLuas(selectedArea)}</div>
              <div className="text-[11px] text-blue-500 mt-1">
                {selectedPolyCoords ? `${selectedPolyCoords.length} titik polygon` : `≈ ${Math.round(Math.sqrt(selectedProspect.luas))}×${Math.round(Math.sqrt(selectedProspect.luas))} m`}
              </div>
            </div>
            <HouseCapacityCard areaSqm={selectedArea} />
            <div className="space-y-1.5 text-[11px]">
              {[
                { l: "ROI", v: `${selectedProspect.roi}%`, color: selectedProspect.roi >= 25 ? "text-emerald-600" : "text-amber-600" },
                { l: "Harga/m²", v: formatRp(selectedProspect.hargaM2) },
                { l: "Status", v: STATUS_LABELS[selectedProspect.status] ?? selectedProspect.status },
              ].map(({ l, v, color }) => (
                <div key={l} className="flex justify-between">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={cn("font-medium", color)}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">vs lapangan bola</span>
                <span className="font-medium text-blue-600">
                  {selectedArea >= 7140 ? `${(selectedArea / 7140).toFixed(1)}×` : `${((selectedArea / 7140) * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="font-medium">Keterangan:</span>
        {[
          { c: RISK_COLORS.green, l: "Risiko Rendah (ROI ≥25%)" },
          { c: RISK_COLORS.yellow, l: "Risiko Sedang" },
          { c: RISK_COLORS.red, l: "Risiko Tinggi" },
        ].map((i) => (
          <div key={i.l} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: i.c }} />
            {i.l}
          </div>
        ))}
        <span className="ml-auto">⛰ Topo = kontur + nama desa/kecamatan · 🛰 Satelit = foto udara</span>
      </div>
    </div>
  );
}

interface FormState { lokasi: string; luas: string; hargaM2: string; roi: string; aksesJalan: string; }

function ProspectForm({ title, subLabel, form, setForm, onSave, onCancel, saving, compact }: {
  title?: string; subLabel?: string;
  form: FormState; setForm: (fn: (f: FormState) => FormState) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; compact?: boolean;
}) {
  const s: React.CSSProperties = { width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none", boxSizing: "border-box" };
  const valid = form.lokasi && form.luas && form.hargaM2;
  return (
    <div style={{ fontFamily: "inherit" }}>
      {title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>}
      {subLabel && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{subLabel}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Nama Lokasi *</div>
          <input style={s} value={form.lokasi} onChange={e => setForm(f => ({ ...f, lokasi: e.target.value }))} placeholder="Desa / Kecamatan" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Luas (m²) *", key: "luas" as const, placeholder: "m²" },
            { label: "Harga/m² (Rp) *", key: "hargaM2" as const, placeholder: "250000" },
            { label: "ROI (%)", key: "roi" as const, placeholder: ">25%" },
            { label: "Akses Jalan (m)", key: "aksesJalan" as const, placeholder: "min 5m" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{label}</div>
              <input style={s} value={form[key]} type="number" placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        {form.luas && parseFloat(form.luas) > 0 && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#1e40af" }}>
            📐 {formatLuas(parseFloat(form.luas))} · ≈ {Math.round(Math.sqrt(parseFloat(form.luas)))} × {Math.round(Math.sqrt(parseFloat(form.luas)))} m
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onSave} disabled={saving || !valid} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#16a34a", color: "white", border: "none", cursor: "pointer", opacity: !valid ? 0.5 : 1 }}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button onClick={onCancel} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
