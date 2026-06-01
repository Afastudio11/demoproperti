import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useListProjects } from "@workspace/api-client-react";

const FASE_COLORS: Record<string, string> = {
  LAND: "#6b7280",
  PLAN: "#3b82f6",
  LEGAL: "#8b5cf6",
  SELL: "#f59e0b",
  BUILD: "#f97316",
  AKAD: "#10b981",
  HANDOVER: "#06b6d4",
  SCALE: "#84cc16",
};

function createMarkerIcon(fase: string) {
  const color = FASE_COLORS[fase] || "#6b7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

function formatRupiah(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

function MapCenter() {
  const map = useMap();
  useEffect(() => {
    map.setView([-2.5, 118], 5);
  }, [map]);
  return null;
}

export default function IndonesiaMap() {
  const { data: projects } = useListProjects();

  const projectsWithCoords = (projects || []).filter(p => p.lat != null && p.lng != null);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border" style={{ minHeight: 360 }}>
      <MapContainer
        center={[-2.5, 118]}
        zoom={5}
        style={{ height: "100%", width: "100%", minHeight: 360 }}
        scrollWheelZoom={false}
      >
        <MapCenter />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {projectsWithCoords.map(project => (
          <Marker
            key={project.id}
            position={[project.lat!, project.lng!]}
            icon={createMarkerIcon(project.fase)}
            data-testid={`map-marker-project-${project.id}`}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{project.nama}</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>{project.lokasi}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    background: FASE_COLORS[project.fase] + "22",
                    color: FASE_COLORS[project.fase],
                    border: `1px solid ${FASE_COLORS[project.fase]}44`,
                    padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600
                  }}>
                    {project.fase}
                  </span>
                  <span style={{
                    background: project.status === "active" ? "#10b98122" : "#f59e0b22",
                    color: project.status === "active" ? "#10b981" : "#f59e0b",
                    padding: "2px 8px", borderRadius: 12, fontSize: 11
                  }}>
                    {project.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  <span style={{ fontWeight: 600 }}>{project.totalUnit}</span> unit
                  {project.luas && <span> &bull; {new Intl.NumberFormat("id-ID").format(project.luas)} m²</span>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
