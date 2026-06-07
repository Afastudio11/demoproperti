import { Button } from "@/components/ui/button";
import { Settings2, Users, Bell, Palette } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola pengaturan aplikasi dan role pengguna
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: Users,
            title: "Manajemen Pengguna",
            desc: "Tambah pengguna, assign role, dan kelola hak akses dari panel ini.",
            action: "Tambah User",
          },
          {
            icon: Palette,
            title: "Preferensi Tampilan",
            desc: "Menggunakan dark mode. Warna accent dan tata letak dapat dikustomisasi.",
            action: "Konfigurasi",
          },
          {
            icon: Bell,
            title: "Notifikasi & Alert",
            desc: "Atur email dan dashboard alert untuk risiko proyek dan stok material.",
            action: "Konfigurasi",
          },
          {
            icon: Settings2,
            title: "Sistem",
            desc: "Pengaturan API, integrasi pihak ketiga, dan konfigurasi environment.",
            action: "Konfigurasi",
          },
        ].map(({ icon: Icon, title, desc, action }) => (
          <div
            key={title}
            className="bg-card text-card-foreground rounded-xl border p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/50 dark:bg-neutral-800/50 border mt-0.5">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-sm">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 max-w-md">
                  {desc}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-7 shrink-0 bg-muted/50 border-border/50"
            >
              {action}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
