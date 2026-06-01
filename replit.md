# Dashboard Internal Operasional Satara Development

Dashboard operasional internal untuk developer properti di Indonesia. Command center untuk tracking seluruh proyek dari akuisisi lahan hingga serah terima, mencakup workflow LAND→PLAN→LEGAL→SELL→BUILD→AKAD→HANDOVER→SCALE.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run API server (port 8080)
- `pnpm --filter @workspace/satara-dashboard run dev` — run frontend (port 25304)
- `pnpm run typecheck` — typecheck semua packages
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks dan Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter routing, Leaflet (peta interaktif), Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (10 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `lib/db/src/schema/` — DB schema (10 tabel, masing-masing file terpisah)
- `artifacts/api-server/src/routes/` — API route handlers (dashboard, projects, land-prospects, feasibility, legal, leads, customers, units, construction, qc, materials, handovers)
- `artifacts/satara-dashboard/src/pages/` — Halaman frontend (11 halaman)
- `artifacts/satara-dashboard/src/components/indonesia-map.tsx` — Komponen peta Leaflet interaktif

## Architecture decisions

- Contract-first API: OpenAPI spec ditulis dulu, lalu codegen generate hooks dan Zod schemas
- Route ordering Express: `/land-prospects/pipeline-summary` harus di atas `/land-prospects/:id` (begitu juga untuk leads dan customers)
- Leaflet CSS: `@import "leaflet/dist/leaflet.css"` harus di baris paling pertama di `index.css` sebelum `@import "tailwindcss"`
- GeoJSON peta Indonesia (ZIP) di-load via browser `DecompressionStream` API — fallback gracefully jika gagal
- Seed data dijalankan via HTTP calls ke API endpoints (bukan langsung ke DB) untuk memastikan validasi berjalan

## Product

11 modul operasional:
1. **Executive Overview** — KPI board, peta proyek interaktif, cashflow chart, risk & escalation alerts
2. **Daftar Proyek** — List proyek dengan fase & status, filter
3. **Akuisisi Lahan** — Kanban pipeline 7-stage prospek lahan
4. **Perencanaan** — Feasibility study list, metrik ROI/margin
5. **Legal & Perizinan** — Dokumen tracker, bankable gate checker
6. **Marketing** — Lead pipeline kanban 7-stage, KPI marketing (CPL, conversion, booking-to-akad)
7. **Administrasi KPR** — Customer database, KPR pipeline, checklist berkas
8. **Produksi** — Progress per unit (24 item pekerjaan), QC & defect tracker, material stock dengan alert minimum
9. **Serah Terima** — Handover list, BAST status, skor kepuasan
10. **Project Detail** — Timeline fase per proyek, unit list, legal status
11. **Settings** — Placeholder manajemen user & role

## User preferences

- UI dalam Bahasa Indonesia
- Respons agen dalam Bahasa Indonesia
- Theme: dark sidebar navy + gold accent, dense information-rich layout
- Tidak menggunakan emoji di UI

## Gotchas

- Jangan jalankan `pnpm dev` di workspace root — gunakan `restart_workflow` saja
- Leaflet CSS harus jadi baris pertama di `index.css`
- Route spesifik (contoh: `/pipeline-summary`) harus didaftarkan SEBELUM route parametrik (`:id`) di Express
- `UID` adalah readonly variable di bash — jangan gunakan sebagai variable name di shell script
- `python3` tidak tersedia di environment ini — gunakan `node` untuk parsing JSON di bash

## Pointers

- Lihat `pnpm-workspace` skill untuk struktur workspace, TypeScript setup, dan package details
