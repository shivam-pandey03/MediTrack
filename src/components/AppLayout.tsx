import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Receipt, BarChart3, Settings, Bell, Pill, Menu, X, LogOut, MapPin, BellRing, AlertTriangle, Clock, PackageX, PackageMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { setMedicinesPharmacy } from "@/lib/medicines-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAlerts } from "@/lib/alerts";
import { useEmailScheduler } from "@/lib/email-scheduler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const allNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/nearby", label: "Nearby Pharmacies", icon: MapPin },
  { to: "/notifications", label: "Notifications", icon: BellRing },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Medicine Inventory",
  "/billing": "Billing",
  "/nearby": "Nearby Pharmacies",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/settings": "Settings",
};

export const AppLayout = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const title = titles[location.pathname] ?? "MediTrack";
  const { profile, logout } = useAuth();
  const isStaff = profile?.role === "staff";
  const nav = allNav.filter((n) => !("adminOnly" in n && n.adminOnly) || !isStaff);
  useEmailScheduler();

  useEffect(() => {
    setMedicinesPharmacy(profile?.pharmacyId ?? null);
  }, [profile?.pharmacyId]);

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out" });
  };

  const initials =
    (profile?.ownerName || profile?.email || "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Pill className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              MediTrack <span className="text-primary">💊</span>
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1 p-3">
          <div className="px-3 pb-2 pt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-muted">
            Main
          </div>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-white shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("size-4", isActive ? "text-primary" : "text-sidebar-muted group-hover:text-white")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl bg-sidebar-hover p-4">
            <div className="text-xs font-medium text-white">System Status</div>
            <div className="mt-1 text-xs text-sidebar-muted">All services nominal</div>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Connected
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight">
                {profile?.pharmacyName || "MediTrack"}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.ownerName || profile?.email}{profile?.role ? ` · ${profile.role}` : ""}
              </div>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {initials}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" /> Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const a = useAlerts();
  const items: { type: string; name: string; icon: any; color: string }[] = [];
  a.expired.slice(0, 5).forEach((m) =>
    items.push({ type: "Expired", name: m.name, icon: AlertTriangle, color: "text-destructive" }),
  );
  a.outOfStock.slice(0, 5).forEach((m) =>
    items.push({ type: "Out of stock", name: m.name, icon: PackageX, color: "text-destructive" }),
  );
  a.nearExpiry.slice(0, 5).forEach(({ m }) =>
    items.push({ type: "Near expiry", name: m.name, icon: Clock, color: "text-warning" }),
  );
  a.lowStock.slice(0, 5).forEach((m) =>
    items.push({ type: "Low stock", name: m.name, icon: PackageMinus, color: "text-yellow-600" }),
  );
  const latest = items.slice(0, 5);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="size-5" />
          {a.total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-card">
              {a.total > 99 ? "99+" : a.total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        {latest.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">All clear ✅</div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {latest.map((it, i) => {
              const Icon = it.icon;
              return (
                <li key={i} className="flex items-start gap-3 border-b px-4 py-2.5 last:border-0">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", it.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.type}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <NavLink
          to="/notifications"
          className="block border-t px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted"
        >
          View All
        </NavLink>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};