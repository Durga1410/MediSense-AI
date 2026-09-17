import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  PhoneCall,
  ShieldAlert,
  Users,
  LineChart,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assessment", label: "AI Assessment", icon: Activity },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/assessments", label: "Assessments", icon: FileText },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/human-review", label: "Human Review", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-heading text-sm font-bold tracking-tight text-slate-900">MediSense AI</p>
          <p className="text-[11px] font-medium text-slate-500">Understand. Assess. Guide.</p>
        </div>
      )}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" data-testid="app-sidebar-nav">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground shadow-[inset_2px_0_0_0_var(--primary)]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV.find((n) => location.pathname.startsWith(n.to));
  const title =
    location.pathname.startsWith("/assessments/")
      ? "Assessment Report"
      : (current?.label ?? "MediSense AI");

  return (
    <div className="min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex print-hide">
        <Brand />
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">Demo Mode</p>
          <p className="mt-1 text-[11px] leading-snug text-amber-700">
            All patients and assessments are synthetic. Not a medical device.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden print-hide">
        <Brand />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Open navigation menu"
                data-testid="mobile-nav-trigger"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-4">
              <Brand />
            </div>
            <NavList onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Content area */}
      <div className="lg:pl-60">
        <div className="sticky top-0 z-20 hidden items-center justify-between border-b border-slate-200/80 bg-white/85 px-6 py-3 backdrop-blur-xl lg:flex print-hide">
          <h1 className="font-heading text-base font-bold tracking-tight text-slate-900">{title}</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <PhoneCall className="size-3.5" />
              Emergency? Call local emergency services
            </span>
            <NavLink
              to="/assessment"
              className={() => "inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"}
              data-testid="topbar-new-assessment"
            >
              <Activity className="size-4" />
              New Assessment
            </NavLink>
          </div>
        </div>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
