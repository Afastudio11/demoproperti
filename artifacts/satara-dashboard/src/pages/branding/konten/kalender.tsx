import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

const CAT_COLORS: Record<string, string> = {
  edukasi: "bg-blue-500",
  progress_proyek: "bg-emerald-500",
  testimoni: "bg-yellow-400",
  csr: "bg-pink-400",
  company_culture: "bg-purple-500",
  founder_story: "bg-orange-400",
  behind_the_scene: "bg-slate-400",
};
const CAT_LABELS: Record<string, string> = { edukasi: "Edukasi", progress_proyek: "Progress Proyek", testimoni: "Testimoni", csr: "CSR", company_culture: "Company Culture", founder_story: "Founder Story", behind_the_scene: "Behind The Scene" };

export default function BrandingKalender() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const { data: content = [] } = useQuery<any[]>({
    queryKey: ["branding-content", year, month + 1],
    queryFn: () => fetch(`/api/branding/content?year=${year}&month=${month + 1}`).then(r => r.json()),
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const contentByDay: Record<number, any[]> = {};
  for (const c of content) {
    if (!c.scheduledPostDate) continue;
    const d = new Date(c.scheduledPostDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!contentByDay[day]) contentByDay[day] = [];
      contentByDay[day].push(c);
    }
  }

  const selectedContent = selectedDate ? (contentByDay[selectedDate] ?? []) : [];

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDate(null); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDate(null); }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kalender Konten</h1>
          <p className="text-sm text-slate-500">Jadwal posting konten bulanan</p>
        </div>
        <Link href="/branding/konten/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"><Plus size={15} /> Tambah Konten</button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(CAT_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", CAT_COLORS[k])} />
            <span className="text-slate-600">{v}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold text-slate-800">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">{d}</div>
          ))}
          {cells.map((day, i) => {
            const items = day ? (contentByDay[day] ?? []) : [];
            const isToday = day !== null && year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
            const isSelected = day === selectedDate;
            return (
              <div
                key={i}
                onClick={() => day && setSelectedDate(day === selectedDate ? null : day)}
                className={cn(
                  "min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition",
                  day ? "hover:bg-slate-50" : "bg-slate-50/30",
                  isSelected && "bg-blue-50 ring-1 ring-inset ring-blue-200",
                  i % 7 === 0 && "border-l-0",
                )}
              >
                {day && (
                  <>
                    <div className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1", isToday ? "bg-slate-800 text-white" : "text-slate-700")}>{day}</div>
                    <div className="space-y-0.5">
                      {items.slice(0, 3).map((c: any) => (
                        <div key={c.id} className={cn("text-white text-[10px] px-1 py-0.5 rounded truncate", CAT_COLORS[c.category] ?? "bg-slate-400")} title={c.title}>
                          {c.title}
                        </div>
                      ))}
                      {items.length > 3 && <div className="text-[10px] text-slate-400 pl-1">+{items.length - 3} lagi</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">{selectedDate} {MONTHS[month]} {year} — {selectedContent.length} konten</h3>
          {selectedContent.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada konten dijadwalkan pada tanggal ini.</p>
          ) : (
            <div className="space-y-2">
              {selectedContent.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className={cn("w-3 h-3 rounded-full mt-0.5 shrink-0", CAT_COLORS[c.category] ?? "bg-slate-400")} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{c.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{CAT_LABELS[c.category] ?? c.category} · {c.platforms} · PIC: {c.pic}</div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", {
                    idea: "bg-slate-100 text-slate-600", script: "bg-sky-100 text-sky-700",
                    shooting: "bg-blue-100 text-blue-700", editing: "bg-yellow-100 text-yellow-700",
                    review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", posted: "bg-emerald-100 text-emerald-700"
                  }[c.productionStatus] ?? "bg-slate-100")}>{c.productionStatus}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
