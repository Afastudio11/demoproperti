import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAFTAR_PERUMAHAN_SULSEL } from "@/data/perumahan-sulsel";
import { KABUPATEN_DATA, getGradeColor, getGradeLabel, type KabupatenScore } from "@/data/slis-scoring";

// ─── Tile layers ──────────────────────────────────────────────────────────────

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
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom",
  },
  satLabel: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Labels &copy; Esri",
  },
} as const;

type LayerKey = "satellite" | "topo";

// ─── Map bounds ───────────────────────────────────────────────────────────────

const SULSEL_CENTER: [number, number] = [-4.5, 120.5];
const SULSEL_BOUNDS: L.LatLngBoundsExpression = [[-7.5, 118.0], [-1.0, 123.5]];

// ─── GeoJSON fetch & cache ────────────────────────────────────────────────────

const GEOJSON_URL = "/sulsel_desa.geojson";
const _slisDesaCacheRef: { current: { url: string; data: GeoJSON.FeatureCollection } | null } = { current: null };

function normalizeDesaGeoJson(data: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const features = data.features.map(f => {
    if (!f.geometry || f.geometry.type !== "Polygon") return f;
    const coords = f.geometry.coordinates as unknown as number[][][][];
    if (
      Array.isArray(coords[0]) &&
      Array.isArray(coords[0][0]) &&
      Array.isArray(coords[0][0][0])
    ) {
      return { ...f, geometry: { ...f.geometry, coordinates: coords[0] as unknown as GeoJSON.Position[][] } };
    }
    return f;
  });
  return { ...data, features } as GeoJSON.FeatureCollection;
}

async function fetchDesaGeoJson(signal: AbortSignal): Promise<GeoJSON.FeatureCollection | null> {
  if (_slisDesaCacheRef.current?.url === GEOJSON_URL) return _slisDesaCacheRef.current.data;
  try {
    const res = await fetch(GEOJSON_URL, { signal });
    if (!res.ok) return null;
    const raw = await res.json() as GeoJSON.FeatureCollection;
    const data = normalizeDesaGeoJson(raw);
    _slisDesaCacheRef.current = { url: GEOJSON_URL, data };
    return data;
  } catch {
    return null;
  }
}

// ─── Competitor count maps (dari data perumahan Sulsel) ────────────────────────

function normGeoKab(s: string): string {
  return s.toUpperCase().replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "").trim();
}

const _slisKabCountMap = new Map<string, number>();
const _slisKecCountMap = new Map<string, number>();
const _slisDesaCountMap = new Map<string, number>();

for (const p of DAFTAR_PERUMAHAN_SULSEL) {
  const kab = normGeoKab(p.kabupaten);
  _slisKabCountMap.set(kab, (_slisKabCountMap.get(kab) ?? 0) + 1);
  const kec = p.kecamatan.toUpperCase().trim();
  const kecKey = kab + "/" + kec;
  _slisKecCountMap.set(kecKey, (_slisKecCountMap.get(kecKey) ?? 0) + 1);
  if (p.kelurahan) {
    const desaKey = kecKey + "/" + p.kelurahan.toUpperCase().trim();
    _slisDesaCountMap.set(desaKey, (_slisDesaCountMap.get(desaKey) ?? 0) + 1);
  }
}

function competitorCount(name: string, level: number, parentKab?: string | null, parentKec?: string | null): number {
  const normName = name.toUpperCase().trim();
  if (level === 0) return _slisKabCountMap.get(normGeoKab(normName)) ?? 0;
  const kab = normGeoKab(parentKab ?? "");
  if (level === 1) return _slisKecCountMap.get(kab + "/" + normName) ?? 0;
  if (parentKec) {
    const kec = parentKec.toUpperCase().trim();
    const direct = _slisDesaCountMap.get(kab + "/" + kec + "/" + normName);
    if (direct !== undefined) return direct;
  }
  return 0;
}

const POTENTIAL_THRESHOLDS_KAB  = [10,  30,  80, 150, 300];
const POTENTIAL_THRESHOLDS_KEC  = [3,    8,  20,  40,  80];
const POTENTIAL_THRESHOLDS_DESA = [1,    3,   8,  16,  30];
const POTENTIAL_COLORS = ["#15803d", "#4ade80", "#facc15", "#f97316", "#ef4444", "#991b1b"];
const POTENTIAL_LABELS = ["Sangat Baik", "Baik", "Sedang", "Kompetitif", "Jenuh", "Sangat Jenuh"];

function _thresholds(level: number) {
  if (level === 0) return POTENTIAL_THRESHOLDS_KAB;
  if (level === 1) return POTENTIAL_THRESHOLDS_KEC;
  return POTENTIAL_THRESHOLDS_DESA;
}

function potentialColor(count: number, level: number): string {
  if (count === 0) return "#6b7280";
  const thresholds = _thresholds(level);
  for (let i = 0; i < thresholds.length; i++) {
    if (count <= thresholds[i]) return POTENTIAL_COLORS[i];
  }
  return POTENTIAL_COLORS[POTENTIAL_COLORS.length - 1];
}

function potentialLabel(count: number, level: number): string {
  if (count === 0) return "Belum ada data";
  const thresholds = _thresholds(level);
  for (let i = 0; i < thresholds.length; i++) {
    if (count <= thresholds[i]) return POTENTIAL_LABELS[i];
  }
  return POTENTIAL_LABELS[POTENTIAL_LABELS.length - 1];
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function geomCoords(geometry: GeoJSON.Geometry): number[][] {
  const pts: number[][] = [];
  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && typeof coords[0] === "number") { pts.push(coords as number[]); return; }
    (coords as unknown[]).forEach(c => walk(c));
  }
  walk((geometry as any).coordinates);
  return pts;
}

function groupCentroid(features: GeoJSON.Feature[]): [number, number] | null {
  let lat = 0, lng = 0, n = 0;
  for (const f of features) {
    if (!f.geometry) continue;
    for (const c of geomCoords(f.geometry)) { lat += c[1]; lng += c[0]; n++; }
  }
  return n > 0 ? [lat / n, lng / n] : null;
}

// ─── Drill state types ────────────────────────────────────────────────────────

type DrillLevel = 0 | 1 | 2;
interface DrillState { level: DrillLevel; kab: string | null; kec: string | null; }

// ─── AdminDrillLayer ──────────────────────────────────────────────────────────

function AdminDrillLayer({ drill, onDrill, onLoadingChange, onKabGeoClick }: {
  drill: DrillState;
  onDrill: (next: DrillState) => void;
  onLoadingChange: (loading: boolean) => void;
  onKabGeoClick?: (kabName: string) => void;
}) {
  const map = useMap();
  const geoRef = useRef<L.GeoJSON | null>(null);
  const lblRef = useRef<L.LayerGroup | null>(null);
  const onDrillRef = useRef(onDrill);
  const onLoadingRef = useRef(onLoadingChange);
  const onKabGeoClickRef = useRef(onKabGeoClick);
  useEffect(() => { onDrillRef.current = onDrill; }, [onDrill]);
  useEffect(() => { onLoadingRef.current = onLoadingChange; }, [onLoadingChange]);
  useEffect(() => { onKabGeoClickRef.current = onKabGeoClick; }, [onKabGeoClick]);

  useEffect(() => {
    geoRef.current?.remove(); geoRef.current = null;
    lblRef.current?.remove(); lblRef.current = null;

    const drillSnapshot = { ...drill };
    const abortCtrl = new AbortController();
    onLoadingRef.current(true);

    fetchDesaGeoJson(abortCtrl.signal).then(geojson => {
      if (abortCtrl.signal.aborted) return;
      onLoadingRef.current(false);
      if (!geojson) return;

      let features = geojson.features;
      if (drillSnapshot.level >= 1 && drillSnapshot.kab)
        features = features.filter(f => (f.properties as any)?.district === drillSnapshot.kab);
      if (drillSnapshot.level >= 2 && drillSnapshot.kec)
        features = features.filter(f => (f.properties as any)?.sub_district === drillSnapshot.kec);

      const gk = drillSnapshot.level === 0 ? "district" : drillSnapshot.level === 1 ? "sub_district" : "village";
      const foBase = drillSnapshot.level === 0 ? 0.50 : drillSnapshot.level === 1 ? 0.48 : 0.45;
      const foHover = Math.min(foBase + 0.20, 0.78);
      const wBase = drillSnapshot.level === 0 ? 1.0 : drillSnapshot.level === 1 ? 0.8 : 0.5;

      const groups: Record<string, GeoJSON.Feature[]> = {};
      const groupBounds: Record<string, L.LatLngBounds> = {};

      for (const f of features) {
        const k = (f.properties as any)?.[gk] ?? "";
        if (!k) continue;
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      }

      for (const [name, feats] of Object.entries(groups)) {
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const f of feats) {
          if (!f.geometry) continue;
          for (const c of geomCoords(f.geometry)) {
            if (c[1] < minLat) minLat = c[1];
            if (c[1] > maxLat) maxLat = c[1];
            if (c[0] < minLng) minLng = c[0];
            if (c[0] > maxLng) maxLng = c[0];
          }
        }
        if (isFinite(minLat)) groupBounds[name] = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
      }

      const countByKey: Record<string, number> = {};
      for (const key of Object.keys(groups)) {
        countByKey[key] = competitorCount(key, drillSnapshot.level, drillSnapshot.kab, drillSnapshot.kec);
      }

      const geo = L.geoJSON({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection, {
        style(feature) {
          const key = (feature?.properties as any)?.[gk] ?? "";
          const count = countByKey[key] ?? 0;
          const color = potentialColor(count, drillSnapshot.level);
          return { color: "#fff", weight: wBase, opacity: 0.6, fillColor: color, fillOpacity: foBase };
        },
        onEachFeature(feature, lyr) {
          const p = feature.properties as any;
          const key = p?.[gk] ?? "";
          const count = countByKey[key] ?? 0;
          const label = potentialLabel(count, drillSnapshot.level);
          const levelName = drillSnapshot.level === 0 ? "Kabupaten" : drillSnapshot.level === 1 ? "Kecamatan" : "Desa";

          const tooltip = L.tooltip({
            permanent: false, sticky: true, opacity: 0.97, className: "leaflet-potential-tooltip",
          }).setContent(`
            <div style="font-family:sans-serif;font-size:11px;line-height:1.5;min-width:160px">
              <div style="font-weight:700;margin-bottom:2px">${key}</div>
              <div style="color:#6b7280;font-size:10px">${levelName}</div>
              <div style="margin-top:4px;display:flex;align-items:center;gap:6px">
                <span style="background:${potentialColor(count, drillSnapshot.level)};width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.15)"></span>
                <span style="font-weight:600">${label}</span>
              </div>
              <div style="color:#6b7280;font-size:10px;margin-top:2px">${count} perumahan terdaftar</div>
            </div>
          `);
          lyr.bindTooltip(tooltip);

          lyr.on("mouseover", () => {
            geo.eachLayer(gl => {
              if ((gl as any).feature?.properties?.[gk] === key)
                (gl as L.Path).setStyle({ fillOpacity: foHover });
            });
            if (drillSnapshot.level < 2) map.getContainer().style.cursor = "pointer";
          });
          lyr.on("mouseout", () => {
            geo.eachLayer(gl => {
              if ((gl as any).feature?.properties?.[gk] === key)
                (gl as L.Path).setStyle({ fillOpacity: foBase });
            });
            map.getContainer().style.cursor = "";
          });
          lyr.on("click", (e) => {
            const domEvent = (e as unknown as { originalEvent?: Event }).originalEvent;
            if (domEvent) L.DomEvent.stopPropagation(domEvent);
            if (drillSnapshot.level === 2) return;

            const b = groupBounds[key];
            if (b?.isValid()) {
              map.fitBounds(b, { padding: [28, 28], maxZoom: drillSnapshot.level === 0 ? 11 : 13 });
            }
            if (drillSnapshot.level === 0) {
              onKabGeoClickRef.current?.(p?.district ?? key);
              onDrillRef.current({ level: 1, kab: p?.district ?? key, kec: null });
            } else if (drillSnapshot.level === 1) {
              onDrillRef.current({ level: 2, kab: drillSnapshot.kab, kec: p?.sub_district ?? key });
            }
          });
        },
      });
      geo.addTo(map);
      geoRef.current = geo;

      const lblGroup = L.layerGroup().addTo(map);
      for (const [name, feats] of Object.entries(groups)) {
        const c = groupCentroid(feats);
        if (!c) continue;
        const cnt = countByKey[name] ?? 0;
        const lvlClass = drillSnapshot.level === 0 ? "kab" : drillSnapshot.level === 1 ? "kec" : "desa";
        const cntHtml = cnt > 0 ? `<span class="adl-count">${cnt}</span>` : "";
        const icon = L.divIcon({
          html: `<div class="adl-wrap"><span class="adl adl-${lvlClass}">${name}</span>${cntHtml}</div>`,
          className: "", iconSize: [0, 0], iconAnchor: [0, 0],
        });
        L.marker(c, { icon, interactive: false }).addTo(lblGroup);
      }
      lblRef.current = lblGroup;
    });

    return () => { abortCtrl.abort(); };
  }, [drill.level, drill.kab, drill.kec, map]);

  useEffect(() => () => {
    geoRef.current?.remove(); lblRef.current?.remove();
    map.getContainer().style.cursor = "";
  }, [map]);

  return null;
}

// ─── FlyTo helper ─────────────────────────────────────────────────────────────

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 10, { animate: true, duration: 0.8 }); }, [lat, lng, map]);
  return null;
}

// ─── SLISCompetitorMap component ──────────────────────────────────────────────

interface SLISCompetitorMapProps {
  selectedKab: KabupatenScore | null;
  onKabSelect: (kab: KabupatenScore) => void;
  flyTo: { lat: number; lng: number } | null;
}

export function SLISCompetitorMap({ selectedKab, onKabSelect, flyTo }: SLISCompetitorMapProps) {
  const [layer, setLayer] = useState<LayerKey>("topo");
  const [showAdmin, setShowAdmin] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDrill, setAdminDrill] = useState<DrillState>({ level: 0, kab: null, kec: null });

  const tile = TILE_LAYERS[layer];

  function handleKabGeoClick(kabName: string) {
    const norm = kabName.toUpperCase().replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "").trim();
    const match = KABUPATEN_DATA.find(k => {
      const kn = k.name.toUpperCase().replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "").trim();
      return kn === norm || k.name.toUpperCase().includes(norm) || norm.includes(kn);
    });
    if (match) onKabSelect(match);
  }

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
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

        <button
          onClick={() => {
            const next = !showAdmin;
            setShowAdmin(next);
            if (!next) setAdminDrill({ level: 0, kab: null, kec: null });
          }}
          className={cn(
            "flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors",
            showAdmin ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border"
          )}
        >
          {adminLoading
            ? <span className="size-3 animate-spin border border-current border-t-transparent rounded-full inline-block" />
            : <Layers className="size-3" />
          }
          Peta Kompetitor
        </button>

        {showAdmin && adminDrill.kab && (
          <div className="flex items-center gap-1 text-[11px] bg-muted/60 border rounded-lg px-2 py-1">
            <button
              onClick={() => setAdminDrill({ level: 0, kab: null, kec: null })}
              className="font-medium text-blue-500 hover:underline"
            >
              Semua Kab.
            </button>
            <ChevronRight className="size-3 text-muted-foreground shrink-0" />
            <button
              onClick={() => setAdminDrill({ level: 1, kab: adminDrill.kab, kec: null })}
              className={cn("font-medium truncate max-w-[120px]", adminDrill.level === 1 ? "text-foreground" : "text-blue-500 hover:underline")}
            >
              {adminDrill.kab}
            </button>
            {adminDrill.kec && (
              <>
                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[120px]">{adminDrill.kec}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="flex-1 bg-card border rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
        {/* Legend competitor */}
        {showAdmin && (
          <div className="absolute bottom-6 left-3 z-[1000] bg-white/95 border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-[10px] pointer-events-none">
            <div className="font-semibold text-gray-700 mb-1.5 text-[11px]">Kepadatan Kompetitor</div>
            {[
              { color: "#15803d", label: "Sangat Baik" },
              { color: "#4ade80", label: "Baik" },
              { color: "#facc15", label: "Sedang" },
              { color: "#f97316", label: "Kompetitif" },
              { color: "#ef4444", label: "Jenuh" },
              { color: "#991b1b", label: "Sangat Jenuh" },
              { color: "#6b7280", label: "Belum ada data" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 py-0.5">
                <span style={{ background: color, width: 10, height: 10, borderRadius: 2, display: "inline-block", border: "1px solid rgba(0,0,0,.12)", flexShrink: 0 }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-[9px] text-gray-400">
              {adminDrill.level === 0 ? "Per Kabupaten (≤10 / ≤30 / ≤80 / …)" : adminDrill.level === 1 ? "Per Kecamatan (≤3 / ≤8 / ≤20 / …)" : "Per Kelurahan/Desa (≤1 / ≤3 / ≤8 / …)"}
              {" "}&bull; {_slisKabCountMap.size > 0 ? `${Array.from(_slisKabCountMap.values()).reduce((a, b) => a + b, 0).toLocaleString("id-ID")} perumahan` : ""}
            </div>
          </div>
        )}

        {/* Legend SLIS score */}
        {!showAdmin && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur border rounded-lg p-2.5 shadow-lg z-[1000] text-[10px]">
            <div className="font-semibold mb-1.5 text-foreground">Skor Potensi SLIS</div>
            {[
              { color: "#16a34a", label: "Sangat Potensial (≥80)" },
              { color: "#d97706", label: "Potensial (65–79)" },
              { color: "#ea580c", label: "Sedang (50–64)" },
              { color: "#dc2626", label: "Tidak Direk. (<50)" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 mt-0.5">
                <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <MapContainer
          center={SULSEL_CENTER}
          zoom={8}
          minZoom={7}
          maxZoom={20}
          maxBounds={SULSEL_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={20} maxNativeZoom={18} />
          {layer === "satellite" && (
            <TileLayer
              url={TILE_LAYERS.satLabel.url}
              attribution={TILE_LAYERS.satLabel.attribution}
              maxZoom={20}
              maxNativeZoom={18}
              opacity={0.9}
            />
          )}

          {showAdmin && (
            <AdminDrillLayer
              drill={adminDrill}
              onDrill={setAdminDrill}
              onLoadingChange={setAdminLoading}
              onKabGeoClick={handleKabGeoClick}
            />
          )}

          {flyTo && <MapFlyTo lat={flyTo.lat} lng={flyTo.lng} />}

          {KABUPATEN_DATA.map((kab) => {
            const color = getGradeColor(kab.grade);
            const isSelected = selectedKab?.id === kab.id;
            return (
              <CircleMarker
                key={kab.id}
                center={[kab.lat, kab.lng]}
                radius={isSelected ? 14 : 7}
                pathOptions={{
                  color: isSelected ? "#000" : "rgba(0,0,0,0.4)",
                  fillColor: color,
                  fillOpacity: isSelected ? 1 : 0.85,
                  weight: isSelected ? 2.5 : 1,
                }}
                eventHandlers={{ click: () => onKabSelect(kab) }}
              >
                <Tooltip permanent={false} direction="top" offset={[0, -8]}>
                  <div className="text-xs">
                    <div className="font-bold">{kab.name}</div>
                    <div>Skor SLIS: <strong>{kab.score}</strong> — {getGradeLabel(kab.grade)}</div>
                    <div className="text-[10px] text-gray-500">Klik untuk detail</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
