import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, Loader2, RotateCcw, ExternalLink, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import type { KabupatenScore } from "@/data/slis-scoring";
import { KABUPATEN_DATA } from "@/data/slis-scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualisasiData {
  tipe: "bar_horizontal" | "none";
  judul: string;
  satuan: string;
  data: { label: string; nilai: number; highlight?: boolean }[];
}

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  poin?: string[];
  visualisasi?: VisualisasiData | null;
  sources?: { title: string; url: string }[];
  followUp?: string[];
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Bagaimana potensi Bantaeng untuk perumahan subsidi?",
  "Kabupaten mana yang paling cocok untuk ekspansi berikutnya?",
  "Berikan analisis kompetitor di Gowa dan sekitarnya",
  "Bagaimana tren harga tanah di Bone vs Takalar?",
  "Daerah mana yang memiliki realisasi FLPP tertinggi?",
  "Analisis risiko investasi di Jeneponto",
];

// ─── Detect kabupaten dari pertanyaan user ────────────────────────────────────

function detectKabupaten(question: string): KabupatenScore | undefined {
  const q = question.toLowerCase();
  return KABUPATEN_DATA.find((k) => {
    const name = k.name.toLowerCase();
    const id = k.id.toLowerCase();
    return (
      q.includes(name) ||
      q.includes(id) ||
      q.includes(name.replace("kota ", "")) ||
      q.includes(name.replace("kabupaten ", ""))
    );
  });
}

// ─── Bar chart visualisasi ────────────────────────────────────────────────────

function VisualisasiChart({ vis }: { vis: VisualisasiData }) {
  if (vis.tipe === "none" || !vis.data?.length) return null;

  const maxVal = Math.max(...vis.data.map((d) => d.nilai));

  return (
    <div className="mt-3 bg-muted/30 border border-border/50 rounded-xl p-3">
      <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        {vis.judul}
      </div>
      <ResponsiveContainer width="100%" height={Math.min(32 * vis.data.length + 24, 280)}>
        <BarChart
          layout="vertical"
          data={vis.data}
          margin={{ top: 2, right: 48, left: 8, bottom: 2 }}
        >
          <XAxis
            type="number"
            domain={[0, maxVal * 1.15]}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              fontSize: 11,
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              color: "hsl(var(--foreground))",
            }}
            formatter={(val: number) => [`${val} ${vis.satuan}`, "Nilai"]}
          />
          <Bar dataKey="nilai" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {vis.data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.highlight ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                opacity={entry.highlight ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-muted-foreground mt-1 text-right">{vis.satuan}</div>
    </div>
  );
}

// ─── Satu message bubble ──────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onFollowUp,
}: {
  msg: AiMessage;
  onFollowUp: (q: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-foreground text-background rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[12.5px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="flex gap-2">
        <div className="size-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="size-3 text-red-500" />
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12px] text-red-700 dark:text-red-400">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="size-6 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-1">
        <Brain className="size-3 text-background" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Main answer */}
        <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3.5 py-3 text-[12.5px] leading-relaxed text-foreground whitespace-pre-line">
          {msg.content}
        </div>

        {/* Poin penting */}
        {msg.poin && msg.poin.length > 0 && (
          <div className="bg-muted/40 border border-border/40 rounded-xl px-3.5 py-2.5 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Poin Utama
            </div>
            {msg.poin.map((p, i) => (
              <div key={i} className="flex gap-2 text-[11.5px] text-foreground/90">
                <span className="text-foreground/40 shrink-0 font-bold">{i + 1}.</span>
                <span className="leading-relaxed">{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Visualisasi */}
        {msg.visualisasi && msg.visualisasi.tipe !== "none" && (
          <VisualisasiChart vis={msg.visualisasi} />
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-2 py-0.5 hover:border-foreground/30 transition-colors"
              >
                <ExternalLink className="size-2.5" />
                {s.title.length > 40 ? s.title.slice(0, 40) + "…" : s.title}
              </a>
            ))}
          </div>
        )}

        {/* Follow-up questions */}
        {msg.followUp && msg.followUp.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground">Pertanyaan lanjutan:</div>
            <div className="flex flex-col gap-1">
              {msg.followUp.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(q)}
                  className="flex items-center gap-1.5 text-left text-[11.5px] text-muted-foreground hover:text-foreground border border-border/40 hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors bg-muted/20 hover:bg-muted/50"
                >
                  <ChevronRight className="size-3 shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SlisAiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      const userMsg: AiMessage = {
        id: Date.now().toString(),
        role: "user",
        content: question.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // Detect kabupaten dari pertanyaan
        const detectedKab = detectKabupaten(question);

        // Kirim history (tanpa visualisasi/poin — hanya teks)
        const history = [...messages, userMsg]
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));

        const payload: Record<string, unknown> = {
          question: question.trim(),
          history,
          slisRanking: KABUPATEN_DATA.slice(0, 10).map((k) => ({
            name: k.name,
            score: k.score,
            grade: k.grade,
          })),
        };

        if (detectedKab) {
          payload["slisKab"] = {
            name: detectedKab.name,
            score: detectedKab.score,
            grade: detectedKab.grade,
            populasi: detectedKab.populasi,
            hargaTanahRange: detectedKab.hargaTanahRange,
            kompetitorCount: detectedKab.kompetitorCount,
            potensiPasar: detectedKab.potensiPasar,
            infrastruktur: detectedKab.infrastruktur,
            pertumbuhanPct: detectedKab.pertumbuhanPct,
            pertumbuhanEkonomi: detectedKab.pertumbuhanEkonomi,
            pdrbPerKapita: detectedKab.pdrbPerKapita,
            tingkatUrbanisasi: detectedKab.tingkatUrbanisasi,
            tingkatPengangguran: detectedKab.tingkatPengangguran,
            realisasiFLPP: detectedKab.realisasiFLPP,
            kecamatanTeratas: detectedKab.kecamatan.slice(0, 3).map((k) => ({
              name: k.name,
              score: k.score,
            })),
          };
        }

        const resp = await fetch("/api/ai/slis-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();

        const aiMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.jawaban ?? "Tidak ada respons dari AI.",
          poin: data.poin_penting ?? [],
          visualisasi: data.visualisasi ?? null,
          sources: data.sources ?? [],
          followUp: data.pertanyaan_lanjutan ?? [],
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.",
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, loading]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 520, maxHeight: "calc(100vh - 220px)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-foreground flex items-center justify-center">
            <Brain className="size-3.5 text-background" />
          </div>
          <div>
            <div className="text-[12px] font-semibold">Analisis Wilayah</div>
            <div className="text-[10px] text-muted-foreground">
              Web research + data internal Sulawesi Selatan
            </div>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-center space-y-1">
              <div className="text-[13px] font-semibold">Tanya tentang wilayah Sulawesi Selatan</div>
              <div className="text-[11px] text-muted-foreground max-w-sm">
                AI akan mencari data real-time — berita, ekonomi, infrastruktur, properti — dan
                mengkombinasikannya dengan skor SLIS internal untuk memberikan analisis mendalam.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left text-[11.5px] border border-border/50 hover:border-foreground/30 rounded-xl px-3.5 py-2.5 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onFollowUp={sendMessage} />
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="size-6 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-1">
                  <Brain className="size-3 text-background" />
                </div>
                <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Mencari data dan menganalisis</span>
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce [animation-delay:0ms]">.</span>
                      <span className="animate-bounce [animation-delay:150ms]">.</span>
                      <span className="animate-bounce [animation-delay:300ms]">.</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1">
                    Web search sedang berjalan — bisa memakan 5–15 detik
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3 bg-card">
        {!isEmpty && !loading && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-[10px] border border-border/40 rounded-full px-2.5 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors hover:bg-muted/30"
              >
                {q.length > 45 ? q.slice(0, 45) + "…" : q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Contoh: Bagaimana potensi Bantaeng untuk perumahan subsidi?"
            disabled={loading}
            rows={2}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5",
              "text-[12.5px] placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors leading-relaxed"
            )}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
              input.trim() && !loading
                ? "bg-foreground text-background hover:bg-foreground/80"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground/50 mt-1.5 text-right">
          Enter untuk kirim • Shift+Enter untuk baris baru
        </div>
      </div>
    </div>
  );
}
