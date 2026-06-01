import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Rectangle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useListLandProspects, useUpdateLandProspect } from "@workspace/api-client-react";
import type { LandProspect } from "@workspace/api-client-react";
import { MapPin, SquareDashed, Info, Loader2 } from "lucide-react";
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

function createPinIcon(color: string, active = false) {
  const size = active ? 36 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size * 1.5}">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -(size * 1.5)],
  });
}

function createDraftIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#7c3aed" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.95"/>
    <text x="12" y="16" text-anchor="middle" font-size="10" fill="#7c3aed" font-weight="bold">+</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
}

function formatLuas(luas: number) {
  if (luas >= 10000) return `${(luas / 10000).toFixed(2)} Ha`;
  return `${luas.toLocaleString("id-ID")} m²`;
}

function formatRupiah(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

function calcActualBounds(lat: number, lng: number, luas: number): L.LatLngBounds {
  const sideM = Math.sqrt(luas);
  const latOff = sideM / 111320;
  const lngOff = sideM / (111320 * Math.cos((lat * Math.PI) / 180));
  return L.latLngBounds(
    [lat - latOff / 2, lng - lngOff / 2],
    [lat + latOff / 2, lng + lngOff / 2]
  );
}

function MapClickHandler({
  addMode,
  onMapClick,
}: {
  addMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (addMode) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitSulsel() {
  const map = useMap();
  useEffect(() => {
    map.setView(SULSEL_CENTER, 8);
  }, [map]);
  return null;
}

interface DraftPin {
  lat: number;
  lng: number;
  lokasi: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  loading: boolean;
}

interface ActiveRect {
  bounds: L.LatLngBounds;
  luas: number;
  sideM: number;
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "id" } });
    const data = await res.json();
    const a = data.address || {};
    return {
      lokasi: data.display_name?.split(",").slice(0, 3).join(", ") ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      kelurahan: a.village || a.suburb || a.neighbourhood || "",
      kecamatan: a.city_district || a.district || a.county || "",
      kabupaten: a.city || a.county || a.regency || "",
    };
  } catch {
    return {
      lokasi: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      kelurahan: "",
      kecamatan: "",
      kabupaten: "",
    };
  }
}

interface ProspectFormState {
  lokasi: string;
  luas: string;
  hargaM2: string;
  roi: string;
  aksesJalan: string;
}

export default function SulselAcquisitionMap() {
  const { data: prospects, refetch } = useListLandProspects({});
  const updateMutation = useUpdateLandProspect();

  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [activeRect, setActiveRect] = useState<ActiveRect | null>(null);
  const [form, setForm] = useState<ProspectFormState>({
    lokasi: "",
    luas: "",
    hargaM2: "",
    roi: "",
    aksesJalan: "",
  });
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);

  const placedProspects = (prospects ?? []).filter((p) => p.lat != null && p.lng != null);
  const unplacedCount = (prospects ?? []).filter((p) => p.lat == null).length;

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      setDraft({ lat, lng, lokasi: "", kelurahan: "", kecamatan: "", kabupaten: "", loading: true });
      const geo = await reverseGeocode(lat, lng);
      setDraft({ lat, lng, ...geo, loading: false });
      setForm((f) => ({ ...f, lokasi: geo.lokasi }));
    },
    []
  );

  const handleSaveDraft = async () => {
    if (!draft || !form.lokasi || !form.luas || !form.hargaM2) return;
    setSaving(true);
    try {
      const body = {
        lokasi: form.lokasi,
        luas: parseFloat(form.luas),
        hargaM2: parseFloat(form.hargaM2),
        status: "prospek_baru" as const,
        roi: parseFloat(form.roi) || 0,
        aksesJalan: parseFloat(form.aksesJalan) || undefined,
        lat: draft.lat,
        lng: draft.lng,
        kelurahan: draft.kelurahan,
        kecamatan: draft.kecamatan,
        kabupaten: draft.kabupaten,
      };
      const resp = await fetch("/api/land-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        setDraft(null);
        setAddMode(false);
        setForm({ lokasi: "", luas: "", hargaM2: "", roi: "", aksesJalan: "" });
        refetch();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkerClick = (p: LandProspect) => {
    setSelectedId(p.id);
    if (p.lat != null && p.lng != null && p.luas) {
      const bounds = calcActualBounds(p.lat, p.lng, p.luas);
      const sideM = Math.sqrt(p.luas);
      setActiveRect({ bounds, luas: p.luas, sideM });
    } else {
      setActiveRect(null);
    }
  };

  const handleSavePosition = async (id: number, lat: number, lng: number) => {
    const geo = await reverseGeocode(lat, lng);
    await updateMutation.mutateAsync({
      id,
      data: { lat, lng, kelurahan: geo.kelurahan, kecamatan: geo.kecamatan, kabupaten: geo.kabupaten },
    });
    refetch();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          <span>{placedProspects.length} lahan dipetakan</span>
          {unplacedCount > 0 && (
            <span className="text-amber-600 font-medium">· {unplacedCount} belum dipetakan</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {addMode && (
            <span className="text-xs text-violet-600 font-medium animate-pulse">
              Klik di peta untuk menandai lokasi lahan
            </span>
          )}
          <button
            onClick={() => {
              setAddMode((m) => !m);
              setDraft(null);
            }}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
              addMode
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            <MapPin className="size-3.5" />
            {addMode ? "Batal" : "Tambah Lokasi Baru"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        <div
          className={cn(
            "flex-1 rounded-xl overflow-hidden border relative",
            addMode && "ring-2 ring-violet-400 ring-offset-1"
          )}
          style={{ minHeight: 480 }}
        >
          {addMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
              Klik peta untuk menandai lokasi lahan
            </div>
          )}
          <MapContainer
            center={SULSEL_CENTER}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
            className={addMode ? "cursor-crosshair" : ""}
          >
            <FitSulsel />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler addMode={addMode} onMapClick={handleMapClick} />

            {placedProspects.map((p) => (
              <Marker
                key={p.id}
                position={[p.lat!, p.lng!]}
                icon={createPinIcon(
                  RISK_COLORS[p.riskLevel ?? "default"] ?? RISK_COLORS.default,
                  selectedId === p.id
                )}
                eventHandlers={{ click: () => handleMarkerClick(p) }}
              >
                <Popup
                  onOpen={() => handleMarkerClick(p)}
                  onClose={() => { setActiveRect(null); setSelectedId(null); }}
                  maxWidth={280}
                >
                  <div style={{ fontFamily: "inherit", minWidth: 240 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.lokasi}</div>
                    {(p.kelurahan || p.kecamatan || p.kabupaten) && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                        {[p.kelurahan, p.kecamatan, p.kabupaten].filter(Boolean).join(", ")}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                      {[
                        { label: "Luas", value: formatLuas(p.luas) },
                        { label: "Harga/m²", value: formatRupiah(p.hargaM2) },
                        { label: "ROI", value: `${p.roi}%`, highlight: p.roi >= 25 },
                        { label: "Margin", value: `${p.margin}%`, highlight: p.margin >= 20 },
                        { label: "Akses Jalan", value: p.aksesJalan ? `${p.aksesJalan} m` : "-" },
                        { label: "Status", value: STATUS_LABELS[p.status] ?? p.status },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} style={{ background: "#f9fafb", borderRadius: 6, padding: "4px 8px", border: "1px solid #e5e7eb" }}>
                          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: highlight ? "#16a34a" : "#111827" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {p.luas && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>📐</span> Ukuran Lahan Sebenarnya
                        </div>
                        <div style={{ fontSize: 12, color: "#1e40af" }}>
                          Luas: <strong>{formatLuas(p.luas)}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>
                          Setara persegi {Math.round(Math.sqrt(p.luas))} × {Math.round(Math.sqrt(p.luas))} m
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                          Kotak biru di peta = ukuran asli lahan
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{
                        background: (RISK_COLORS[p.riskLevel ?? "default"] ?? "#6b7280") + "20",
                        color: RISK_COLORS[p.riskLevel ?? "default"] ?? "#6b7280",
                        border: `1px solid ${(RISK_COLORS[p.riskLevel ?? "default"] ?? "#6b7280")}44`,
                        padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600
                      }}>
                        {p.riskLevel === "green" ? "Risiko Rendah" : p.riskLevel === "yellow" ? "Risiko Sedang" : p.riskLevel === "red" ? "Risiko Tinggi" : "Belum Dinilai"}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {activeRect && (
              <Rectangle
                bounds={activeRect.bounds}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 4",
                }}
              />
            )}

            {draft && (
              <Marker
                position={[draft.lat, draft.lng]}
                icon={createDraftIcon()}
                ref={draftMarkerRef}
              >
                <Popup>
                  {draft.loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <Loader2 className="size-4 animate-spin" />
                      <span style={{ fontSize: 12 }}>Mencari alamat...</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: "inherit", minWidth: 240 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📍 Tambah Prospek Lahan</div>
                      {draft.kelurahan && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                          {[draft.kelurahan, draft.kecamatan, draft.kabupaten].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Nama Lokasi *</div>
                          <input
                            style={{ width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
                            value={form.lokasi}
                            onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))}
                            placeholder="Contoh: Desa Bonto, Gowa"
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Luas (m²) *</div>
                            <input
                              style={{ width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
                              value={form.luas}
                              onChange={(e) => setForm((f) => ({ ...f, luas: e.target.value }))}
                              type="number"
                              placeholder="Contoh: 5000"
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Harga/m² (Rp) *</div>
                            <input
                              style={{ width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
                              value={form.hargaM2}
                              onChange={(e) => setForm((f) => ({ ...f, hargaM2: e.target.value }))}
                              type="number"
                              placeholder="Contoh: 250000"
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>ROI (%)</div>
                            <input
                              style={{ width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
                              value={form.roi}
                              onChange={(e) => setForm((f) => ({ ...f, roi: e.target.value }))}
                              type="number"
                              placeholder=">25%"
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Akses Jalan (m)</div>
                            <input
                              style={{ width: "100%", fontSize: 12, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
                              value={form.aksesJalan}
                              onChange={(e) => setForm((f) => ({ ...f, aksesJalan: e.target.value }))}
                              type="number"
                              placeholder="Min 5m"
                            />
                          </div>
                        </div>
                        {form.luas && (
                          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 8px", fontSize: 11, color: "#1e40af" }}>
                            📐 {parseFloat(form.luas) > 0 ? `${formatLuas(parseFloat(form.luas))} ≈ persegi ${Math.round(Math.sqrt(parseFloat(form.luas)))} × ${Math.round(Math.sqrt(parseFloat(form.luas)))} m` : "Masukkan luas..."}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={handleSaveDraft}
                            disabled={saving || !form.lokasi || !form.luas || !form.hargaM2}
                            style={{
                              flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: "#16a34a", color: "white", border: "none", cursor: "pointer",
                              opacity: (!form.lokasi || !form.luas || !form.hargaM2) ? 0.5 : 1
                            }}
                          >
                            {saving ? "Menyimpan..." : "Simpan"}
                          </button>
                          <button
                            onClick={() => setDraft(null)}
                            style={{
                              padding: "6px 12px", borderRadius: 6, fontSize: 12,
                              background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer"
                            }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {activeRect && (
          <div className="w-56 shrink-0 bg-card border rounded-xl p-4 flex flex-col gap-3 self-start">
            <div className="flex items-center gap-2">
              <SquareDashed className="size-4 text-blue-500" />
              <span className="text-xs font-semibold">Ukuran Asli Lahan</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{formatLuas(activeRect.luas)}</div>
              <div className="text-xs text-blue-500 mt-1">
                ≈ {Math.round(activeRect.sideM)} × {Math.round(activeRect.sideM)} m
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-1.5 mb-1.5">
                <Info className="size-3 shrink-0 mt-0.5 text-blue-400" />
                Kotak biru di peta menunjukkan ukuran sebenarnya lahan di lapangan.
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Lahan:</span>
                  <span className="font-medium">{formatLuas(activeRect.luas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sisi persegi:</span>
                  <span className="font-medium">{Math.round(activeRect.sideM)} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Lapangan bola:</span>
                  <span className="font-medium">~7.140 m²</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Perbandingan:</span>
                  <span className="font-medium text-blue-600">
                    {activeRect.luas >= 7140
                      ? `${(activeRect.luas / 7140).toFixed(1)}× lapangan`
                      : `${((activeRect.luas / 7140) * 100).toFixed(0)}% lapangan`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="font-medium">Keterangan pentul:</span>
        {[
          { color: RISK_COLORS.green, label: "Risiko Rendah (ROI ≥25%)" },
          { color: RISK_COLORS.yellow, label: "Risiko Sedang" },
          { color: RISK_COLORS.red, label: "Risiko Tinggi" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
        <span className="ml-auto">Klik pentul → lihat kotak ukuran asli lahan</span>
      </div>
    </div>
  );
}
