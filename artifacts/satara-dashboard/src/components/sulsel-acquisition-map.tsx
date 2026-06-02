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
import { MapPin, SquareDashed, PenLine, Trash2, X, Loader2, Home, Search, Mountain, Droplets, ChevronRight, Layers } from "lucide-react";
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

// ─── Desa Border Layer ────────────────────────────────────────────────────────

// GeoJSON cache – keyed on URL so a different URL always re-fetches
const _desaCache: { url: string; data: GeoJSON.FeatureCollection } | null = null as
  | { url: string; data: GeoJSON.FeatureCollection }
  | null;
// Use a wrapper object so we can mutate it (module const reference stays stable)
const _desaCacheRef = { current: _desaCache };

const GEOJSON_URL = "/sulsel_desa.geojson";

async function fetchDesaGeoJson(signal: AbortSignal): Promise<GeoJSON.FeatureCollection | null> {
  if (_desaCacheRef.current?.url === GEOJSON_URL) return _desaCacheRef.current.data;
  try {
    const res = await fetch(GEOJSON_URL, { signal });
    if (!res.ok) return null;
    const data = await res.json() as GeoJSON.FeatureCollection;
    _desaCacheRef.current = { url: GEOJSON_URL, data };
    return data;
  } catch {
    return null;
  }
}

// DesaLayer kept as no-op (Label Desa button removed)
function DesaLayer({ visible: _visible }: { visible: boolean }) {
  return null;
}

// ─── Admin Drill Layer ────────────────────────────────────────────────────────

const ADMIN_PALETTE = [
  "#ef4444","#f97316","#eab308","#22c55e","#06b6d4",
  "#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f43f5e",
  "#84cc16","#0ea5e9","#a855f7","#fb923c","#10b981",
  "#6366f1","#d946ef","#f59e0b","#2dd4bf","#60a5fa",
  "#e879f9","#a78bfa","#34d399","#fb7185","#fbbf24",
];

function adminHashColor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return ADMIN_PALETTE[Math.abs(h) % ADMIN_PALETTE.length];
}

type DrillLevel = 0 | 1 | 2;
interface DrillState { level: DrillLevel; kab: string | null; kec: string | null; }

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

function AdminDrillLayer({ drill, onDrill, onLoadingChange }: {
  drill: DrillState;
  onDrill: (next: DrillState) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const map = useMap();
  const geoRef = useRef<L.GeoJSON | null>(null);
  const lblRef = useRef<L.LayerGroup | null>(null);
  const onDrillRef = useRef(onDrill);
  const onLoadingRef = useRef(onLoadingChange);
  useEffect(() => { onDrillRef.current = onDrill; }, [onDrill]);
  useEffect(() => { onLoadingRef.current = onLoadingChange; }, [onLoadingChange]);

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

      // Pre-compute groups and their bounds in one pass (avoids O(n²) on click)
      const groups: Record<string, GeoJSON.Feature[]> = {};
      const groupBounds: Record<string, L.LatLngBounds> = {};

      for (const f of features) {
        const k = (f.properties as any)?.[gk] ?? "";
        if (!k) continue;
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      }

      // Compute per-group bounds from geomCoords (fast, no Leaflet layer creation)
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
        if (isFinite(minLat)) {
          groupBounds[name] = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        }
      }

      const geo = L.geoJSON({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection, {
        style(feature) {
          const key = (feature?.properties as any)?.[gk] ?? "";
          const color = drillSnapshot.level === 2 ? "#60a5fa" : adminHashColor(key);
          return { color, weight: wBase, opacity: 0.7, fillColor: color, fillOpacity: foBase };
        },
        onEachFeature(feature, lyr) {
          const p = feature.properties as any;
          const key = p?.[gk] ?? "";

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
        const icon = L.divIcon({
          html: `<div class="adl-wrap"><span class="adl adl-${drillSnapshot.level === 0 ? "kab" : drillSnapshot.level === 1 ? "kec" : "desa"}">${name}</span></div>`,
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

// ── Terrain analysis helpers ──────────────────────────────────────────────────

function pointInPoly(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TerrainResult {
  elevMin: number; elevMax: number; elevAvg: number;
  slopeAvgPct: number; slopeMaxPct: number;
  waterwayName: string; waterwayType: string; waterwayDistM: number | null;
  pointCount: number;
}

async function analyzeTerrainForPolygon(
  coords: [number, number][],
  center: [number, number]
): Promise<TerrainResult | null> {
  const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  // 5×5 sample grid, filter to points inside polygon
  const GRID = 5;
  const pts: [number, number][] = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const lat = minLat + (maxLat - minLat) * (i + 0.5) / GRID;
      const lng = minLng + (maxLng - minLng) * (j + 0.5) / GRID;
      if (pointInPoly(lat, lng, coords)) pts.push([lat, lng]);
    }
  }
  if (pointInPoly(center[0], center[1], coords)) pts.push(center);
  if (pts.length < 2) return null;

  const locStr = pts.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join("|");
  const buf = 0.02;

  const [elevRes, waterwayRes] = await Promise.allSettled([
    fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${locStr}`).then(r => r.json()),
    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=[out:json][timeout:15];(way["waterway"~"river|stream|canal|drain"](${(minLat - buf).toFixed(5)},${(minLng - buf).toFixed(5)},${(maxLat + buf).toFixed(5)},${(maxLng + buf).toFixed(5)}););out center;`,
    }).then(r => r.json()),
  ]);

  // Elevation
  type ElevPt = { lat: number; lng: number; elev: number };
  let elevPts: ElevPt[] = [];
  if (elevRes.status === "fulfilled" && Array.isArray(elevRes.value?.results)) {
    elevPts = (elevRes.value.results as { elevation: number | null }[])
      .map((r, i) => ({ lat: pts[i][0], lng: pts[i][1], elev: r.elevation ?? null }))
      .filter((p): p is ElevPt => p.elev !== null);
  }
  if (elevPts.length < 2) return null;

  const elevs = elevPts.map(p => p.elev);
  const elevMin = Math.min(...elevs), elevMax = Math.max(...elevs);
  const elevAvg = elevs.reduce((a, b) => a + b, 0) / elevs.length;

  // Slope between all pairs
  const slopes: number[] = [];
  for (let i = 0; i < elevPts.length; i++) {
    for (let j = i + 1; j < elevPts.length; j++) {
      const d = haversineM(elevPts[i].lat, elevPts[i].lng, elevPts[j].lat, elevPts[j].lng);
      if (d > 5) slopes.push(Math.abs(elevPts[i].elev - elevPts[j].elev) / d * 100);
    }
  }
  const slopeAvgPct = slopes.length ? slopes.reduce((a, b) => a + b) / slopes.length : 0;
  const slopeMaxPct = slopes.length ? Math.max(...slopes) : 0;

  // Nearest waterway
  let waterwayName = "", waterwayType = "", waterwayDistM: number | null = null;
  if (waterwayRes.status === "fulfilled" && Array.isArray(waterwayRes.value?.elements)) {
    let minD = Infinity;
    for (const el of waterwayRes.value.elements as { center?: { lat: number; lon: number }; lat?: number; lon?: number; tags?: { name?: string; waterway?: string } }[]) {
      const wlat = el.center?.lat ?? el.lat;
      const wlng = el.center?.lon ?? el.lon;
      if (wlat != null && wlng != null) {
        const d = haversineM(center[0], center[1], wlat, wlng);
        if (d < minD) {
          minD = d;
          waterwayName = el.tags?.name ?? "";
          waterwayType = el.tags?.waterway ?? "sungai";
          waterwayDistM = d;
        }
      }
    }
  }

  return { elevMin, elevMax, elevAvg, slopeAvgPct, slopeMaxPct, waterwayName, waterwayType, waterwayDistM, pointCount: elevPts.length };
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

function TerrainAnalysisCard({ result, loading }: { result: TerrainResult | null; loading: boolean }) {
  if (loading) return (
    <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 flex items-center gap-2">
      <Loader2 className="size-3.5 animate-spin text-slate-400 shrink-0" />
      <span className="text-[11px] text-muted-foreground">Menganalisis kontur & sungai terdekat...</span>
    </div>
  );
  if (!result) return null;

  const avg = result.slopeAvgPct;
  const slopeLabel = avg < 2 ? "Datar" : avg < 5 ? "Landai" : avg < 15 ? "Miring" : avg < 25 ? "Curam" : "Sangat Curam";
  const slopeColor = avg < 5 ? "text-emerald-700" : avg < 15 ? "text-amber-700" : "text-red-700";
  const slopeBg   = avg < 5 ? "bg-emerald-50 border-emerald-200" : avg < 15 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const d = result.waterwayDistM;
  const floodLabel = d == null ? "Data N/A" : d < 100 ? "Rawan Banjir" : d < 300 ? "Berisiko" : d < 500 ? "Waspada" : "Aman";
  const floodColor = d == null ? "text-muted-foreground" : d < 100 ? "text-red-700" : d < 300 ? "text-orange-700" : d < 500 ? "text-amber-700" : "text-emerald-700";
  const floodBg   = d == null ? "bg-muted border-border" : d < 100 ? "bg-red-50 border-red-200" : d < 300 ? "bg-orange-50 border-orange-200" : d < 500 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";

  return (
    <div className="border border-sky-200 bg-sky-50/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Mountain className="size-3.5 text-sky-600 shrink-0" />
        <span className="text-[11px] font-semibold text-sky-700">Analisis Kontur & Risiko</span>
        <span className="text-[9px] text-muted-foreground ml-auto">{result.pointCount} titik sampel</span>
      </div>

      {/* Elevasi */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          { l: "Min", v: `${result.elevMin.toFixed(0)} m` },
          { l: "Rata-rata", v: `${result.elevAvg.toFixed(0)} m` },
          { l: "Maks", v: `${result.elevMax.toFixed(0)} m` },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white/80 rounded px-1 py-1.5 border border-sky-100">
            <div className="text-[9px] text-muted-foreground leading-none mb-0.5">{l}</div>
            <div className="text-[11px] font-semibold">{v}</div>
          </div>
        ))}
      </div>

      {/* Kemiringan */}
      <div className={cn("border rounded-lg px-2.5 py-2 space-y-0.5", slopeBg)}>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground font-medium">Kemiringan</span>
          <span className={cn("text-[10px] font-bold", slopeColor)}>{slopeLabel}</span>
        </div>
        <div className={cn("text-sm font-bold", slopeColor)}>
          {result.slopeAvgPct.toFixed(1)}%
          <span className="text-[10px] font-normal text-muted-foreground ml-1">rata-rata</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Maks {result.slopeMaxPct.toFixed(1)}% · Beda ketinggian {(result.elevMax - result.elevMin).toFixed(0)} m
        </div>
      </div>

      {/* Sungai terdekat */}
      <div className={cn("border rounded-lg px-2.5 py-2 space-y-0.5", floodBg)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Droplets className="size-3 text-sky-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground font-medium">Sungai/Saluran Terdekat</span>
          </div>
          <span className={cn("text-[10px] font-bold", floodColor)}>{floodLabel}</span>
        </div>
        {d != null ? (
          <>
            <div className={cn("text-sm font-bold", floodColor)}>
              {d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`}
            </div>
            {result.waterwayName && (
              <div className="text-[10px] text-muted-foreground truncate capitalize">
                {result.waterwayType} · {result.waterwayName}
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">Tidak ada data sungai ditemukan</div>
        )}
      </div>
    </div>
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

// Komponen pengendali fly-to di dalam MapContainer
function MapFlyHandler({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  const prevTarget = useRef<[number, number, number] | null>(null);
  useEffect(() => {
    if (target && target !== prevTarget.current) {
      prevTarget.current = target;
      map.flyTo([target[0], target[1]], target[2], { duration: 1.4 });
    }
  }, [target, map]);
  return null;
}

async function geocodeNominatim(kab: string, kec: string, kel: string): Promise<{ lat: number; lng: number } | null> {
  const parts = [kel, kec, kab, "Sulawesi Selatan", "Indonesia"].filter(Boolean);
  const q = parts.join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=id&bounded=1&viewbox=118.0,-1.0,123.5,-7.5`,
      { headers: { "Accept-Language": "id" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export interface PolygonReadyData {
  luas: number;
  center: [number, number];
  lokasi: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
}

export default function SulselAcquisitionMap({ onSelectProspect, onTerrainData, onPolygonReady }: { onSelectProspect?: (id: number | null) => void; onTerrainData?: (data: TerrainResult | null) => void; onPolygonReady?: (data: PolygonReadyData) => void } = {}) {
  const { data: prospects, refetch } = useListLandProspects({});
  const [layer, setLayer] = useState<LayerKey>("satellite");
  const [showLabel, setShowLabel] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminDrill, setAdminDrill] = useState<DrillState>({ level: 0, kab: null, kec: null });
  const [navKab, setNavKab] = useState("");
  const [navKec, setNavKec] = useState("");
  const [navKel, setNavKel] = useState("");
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number, number] | null>(null);

  const handleNavSearch = useCallback(async () => {
    if (!navKab && !navKec && !navKel) return;
    setNavLoading(true);
    setNavError(false);
    const result = await geocodeNominatim(navKab, navKec, navKel);
    setNavLoading(false);
    if (result) {
      const zoom = navKel ? 14 : navKec ? 12 : 10;
      setFlyTarget([result.lat, result.lng, zoom]);
    } else {
      setNavError(true);
      setTimeout(() => setNavError(false), 3000);
    }
  }, [navKab, navKec, navKel]);
  const [addMode, setAddMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [drawn, setDrawn] = useState<DrawnPoly | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ lokasi: "", luas: "", hargaM2: "", roi: "", aksesJalan: "" });
  const [terrainResult, setTerrainResult] = useState<TerrainResult | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);

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
    setTerrainResult(null);
    setTerrainLoading(true);
    onPolygonReady?.({
      luas: poly.area,
      center: poly.center,
      lokasi: poly.lokasi,
      kelurahan: poly.kelurahan,
      kecamatan: poly.kecamatan,
      kabupaten: poly.kabupaten,
    });
    analyzeTerrainForPolygon(poly.coords, poly.center)
      .then((r) => { setTerrainResult(r); onTerrainData?.(r); })
      .catch(() => {})
      .finally(() => setTerrainLoading(false));
  }, []);

  const cancelAll = useCallback(() => {
    setAddMode(false);
    setDrawMode(false);
    setDraft(null);
    setDrawn(null);
    setForm({ lokasi: "", luas: "", hargaM2: "", roi: "", aksesJalan: "" });
    setTerrainResult(null);
    setTerrainLoading(false);
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
      {/* Baris navigasi lokasi */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={navKab}
          onChange={(e) => setNavKab(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNavSearch()}
          placeholder="Kota / Kabupaten"
          className="h-7 text-xs px-2.5 rounded-lg border bg-card placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary w-36"
        />
        <input
          type="text"
          value={navKec}
          onChange={(e) => setNavKec(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNavSearch()}
          placeholder="Kecamatan"
          className="h-7 text-xs px-2.5 rounded-lg border bg-card placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary w-32"
        />
        <input
          type="text"
          value={navKel}
          onChange={(e) => setNavKel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNavSearch()}
          placeholder="Desa / Kelurahan"
          className="h-7 text-xs px-2.5 rounded-lg border bg-card placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary w-36"
        />
        <button
          onClick={handleNavSearch}
          disabled={navLoading || (!navKab && !navKec && !navKel)}
          className="h-7 flex items-center gap-1.5 text-xs font-medium px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {navLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          Pergi
        </button>
        {navError && <span className="text-xs text-red-500">Lokasi tidak ditemukan</span>}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            <span>{placedCount} dipetakan</span>
          </div>
          {unplacedCount > 0 && <span className="text-amber-600 font-medium">{unplacedCount} belum dipetakan</span>}
        </div>
      </div>

      {/* Baris layer + aksi */}
      <div className="flex items-center justify-end flex-wrap gap-2">
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
          <button
            onClick={() => {
              const next = !showAdmin;
              setShowAdmin(next);
              if (!next) setAdminDrill({ level: 0, kab: null, kec: null });
            }}
            className={cn(
              "flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors",
              showAdmin ? "bg-violet-600 text-white border-violet-600" : "bg-card text-muted-foreground border-border"
            )}
          >
            <Layers className="size-3" /> Batas Wilayah
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
          style={{ minHeight: 600 }}
        >
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
            {showAdmin && <AdminDrillLayer drill={adminDrill} onDrill={setAdminDrill} />}

            <MapFlyHandler target={flyTarget} />
            <GeomanControl drawMode={drawMode} onCreated={handleDrawCreated} onDisable={() => setDrawMode(false)} />
            <ClickHandler active={addMode && !drawMode} onClickMap={handleMapClick} />

            {(prospects ?? []).map((p) => (
              <ProspectMarker
                key={p.id}
                p={p}
                selected={selectedId === p.id}
                onSelect={() => { setSelectedId(p.id); onSelectProspect?.(p.id); }}
                onDeselect={() => { setSelectedId(null); onSelectProspect?.(null); }}
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
          <div className="w-64 shrink-0 bg-card border rounded-xl p-4 flex flex-col gap-3 self-start max-h-[calc(100vh-200px)] overflow-y-auto">
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
            {drawn.kecamatan && (
              <div className="text-[11px] text-muted-foreground">
                {[drawn.kelurahan, drawn.kecamatan, drawn.kabupaten].filter(Boolean).join(", ")}
              </div>
            )}
            <HouseCapacityCard areaSqm={drawn.area} />
            <TerrainAnalysisCard result={terrainResult} loading={terrainLoading} />
            <ProspectForm
              form={form} setForm={setForm}
              onSave={() => handleSave("poly")}
              onCancel={cancelAll}
              saving={saving}
              compact
            />
          </div>
        )}

      </div>

      {selectedProspect && !drawn && (
        <div className="bg-card border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <SquareDashed className="size-4 text-blue-500" />
            <span className="text-xs font-semibold truncate flex-1">{selectedProspect.lokasi.split(",")[0]}</span>
            <button onClick={() => { setSelectedId(null); onSelectProspect?.(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center min-w-36">
              <div className="text-xl font-bold text-blue-700">{formatLuas(selectedArea)}</div>
              <div className="text-[11px] text-blue-500 mt-1">
                {selectedPolyCoords ? `${selectedPolyCoords.length} titik polygon` : `≈ ${Math.round(Math.sqrt(selectedProspect.luas))}×${Math.round(Math.sqrt(selectedProspect.luas))} m`}
              </div>
            </div>
            <HouseCapacityCard areaSqm={selectedArea} />
            <div className="flex flex-col gap-1.5 text-[11px] justify-center min-w-40">
              {[
                { l: "ROI", v: `${selectedProspect.roi}%`, color: selectedProspect.roi >= 25 ? "text-emerald-600" : "text-amber-600" },
                { l: "Harga/m²", v: formatRp(selectedProspect.hargaM2) },
                { l: "Status", v: STATUS_LABELS[selectedProspect.status] ?? selectedProspect.status },
              ].map(({ l, v, color }) => (
                <div key={l} className="flex justify-between gap-6">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={cn("font-medium", color)}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between gap-6 border-t pt-1.5">
                <span className="text-muted-foreground">vs lapangan bola</span>
                <span className="font-medium text-blue-600">
                  {selectedArea >= 7140 ? `${(selectedArea / 7140).toFixed(1)}×` : `${((selectedArea / 7140) * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
