import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Calculator,
  FileText,
  Magnet,
  Users,
  HardHat,
  Key,
  Settings,
  ChevronsUpDown,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Executive Overview", path: "/", icon: LayoutDashboard },
  { name: "Daftar Proyek", path: "/projects", icon: Building2 },
  { name: "Akuisisi Lahan", path: "/akuisisi", icon: MapPin },
  { name: "Perencanaan", path: "/perencanaan", icon: Calculator },
  { name: "Legal & Perizinan", path: "/legal", icon: FileText },
  { name: "Marketing", path: "/marketing", icon: Magnet },
  { name: "Administrasi KPR", path: "/administrasi", icon: Users },
  { name: "Produksi", path: "/produksi", icon: HardHat },
  { name: "Serah Terima", path: "/serah-terima", icon: Key },
  { name: "Settings", path: "/settings", icon: Settings },
];

function DashboardSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="lg:border-r-0!" collapsible="icon">
      <SidebarHeader className="px-2.5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full hover:bg-sidebar-accent rounded-md p-1 -m-1 transition-colors shrink-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background shrink-0">
                <span className="text-sm font-bold">S</span>
              </div>
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Satara Dev.</span>
                <ChevronsUpDown className="size-3 text-muted-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <Settings className="size-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Users className="size-4" />
              <span>Kelola Pengguna</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-2.5">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} className="h-7">
                      <Link href={item.path}>
                        <item.icon className="size-3.5" />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>

      <SidebarFooter className="px-2.5 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm bg-background">
          <div className="text-xs font-semibold leading-tight">Satara Development</div>
          <div className="text-[11px] text-muted-foreground">
            Internal Operations Dashboard
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function DashboardHeader() {
  const [location] = useLocation();
  const currentNav = navItems.find(
    (n) => n.path === location || (n.path !== "/" && location.startsWith(n.path))
  );

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2" />
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          {currentNav && <currentNav.icon className="size-4" />}
          <span className="text-sm font-medium">{currentNav?.name ?? "Dashboard"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 hidden sm:flex">
          <Search className="size-3.5" />
          <span className="text-sm">Cari</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-7">
          <Bell className="size-4" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs bg-foreground text-background">AD</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col bg-background h-full w-full">
          <DashboardHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
