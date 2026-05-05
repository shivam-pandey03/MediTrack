import { useMemo, useEffect, useState } from "react";
import { Package, AlertTriangle, CalendarClock, PackageX, ArrowUpRight, BellRing, XCircle, Clock, PackageMinus } from "lucide-react";
import { useMedicines, getMedicineStatus, formatDate, formatCurrency } from "@/lib/medicines-store";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const getISTGreeting = () => {
  const nowIST = new Date(Date.now() + (new Date().getTimezoneOffset() + 330) * 60000);
  const h = nowIST.getHours();
  if (h >= 5 && h < 12) return "Good Morning ☀️";
  if (h >= 12 && h < 17) return "Good Afternoon 🌤️";
  if (h >= 17 && h < 21) return "Good Evening 🌆";
  return "Good Night 🌙";
};

const Dashboard = () => {
  const medicines = useMedicines();
  const { profile } = useAuth();
  const [greeting, setGreeting] = useState(getISTGreeting);
  useEffect(() => {
    const id = setInterval(() => setGreeting(getISTGreeting()), 60000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    let low = 0, near = 0, out = 0;
    for (const m of medicines) {
      const s = getMedicineStatus(m);
      if (s === "low-stock") low++;
      if (s === "near-expiry") near++;
      if (s === "out-of-stock") out++;
    }
    return { total: medicines.length, low, near, out };
  }, [medicines]);

  const recent = useMemo(
    () => [...medicines].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [medicines],
  );

  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: Array<{
      id: string;
      name: string;
      issue: string;
      value: string;
      severity: "expired" | "near-expiry" | "stock";
      sort: number;
    }> = [];
    for (const m of medicines) {
      const exp = new Date(m.expiryDate);
      const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) {
        items.push({ id: `${m.id}-exp`, name: m.name, issue: "Expired", value: formatDate(m.expiryDate), severity: "expired", sort: 0 });
      } else if (diffDays <= 30) {
        items.push({ id: `${m.id}-near`, name: m.name, issue: "Near Expiry", value: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, severity: "near-expiry", sort: 1 });
      }
      if (m.quantity === 0) {
        items.push({ id: `${m.id}-out`, name: m.name, issue: "Out of Stock", value: "0 units", severity: "stock", sort: 2 });
      } else if (m.quantity < 10) {
        items.push({ id: `${m.id}-low`, name: m.name, issue: "Low Stock", value: `${m.quantity} units`, severity: "stock", sort: 2 });
      }
    }
    return items.sort((a, b) => a.sort - b.sort);
  }, [medicines]);

  const severityStyles = {
    expired: {
      row: "bg-destructive/5 border-destructive/20",
      iconWrap: "bg-destructive/10 text-destructive",
      label: "text-destructive",
      Icon: XCircle,
    },
    "near-expiry": {
      row: "bg-warning-soft/60 border-warning/20",
      iconWrap: "bg-warning/15 text-warning",
      label: "text-warning",
      Icon: Clock,
    },
    stock: {
      row: "bg-warning-soft/40 border-warning/20",
      iconWrap: "bg-warning/15 text-warning",
      label: "text-warning",
      Icon: PackageMinus,
    },
  } as const;

  const cards = [
    { label: "Total Medicines", value: stats.total, icon: Package, accent: "primary" as const, hint: "Tracked SKUs" },
    { label: "Low Stock", value: stats.low, icon: AlertTriangle, accent: "warning" as const, hint: "Below 10 units" },
    { label: "Near Expiry", value: stats.near, icon: CalendarClock, accent: "warning" as const, hint: "Within 30 days" },
    { label: "Out of Stock", value: stats.out, icon: PackageX, accent: "destructive" as const, hint: "Reorder now" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting}{profile?.ownerName ? `, ${profile.ownerName}` : ""}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening across your pharmacy today.</p>
        </div>
        <Link to="/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Open inventory <ArrowUpRight className="size-4" />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent, hint }) => {
          const accentMap = {
            primary: "bg-primary-soft text-primary",
            warning: "bg-warning-soft text-warning",
            destructive: "bg-destructive/10 text-destructive",
          };
          return (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="text-sm font-medium text-muted-foreground">{label}</div>
                <div className={`flex size-9 items-center justify-center rounded-lg ${accentMap[accent]}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
            </div>
          );
        })}
      </div>

      {/* Active Alerts */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BellRing className="size-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Active Alerts</h3>
              <p className="text-xs text-muted-foreground">Issues requiring your attention right now</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {alerts.length} active
          </span>
        </header>
        <div className="divide-y divide-border">
          {alerts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-sm font-medium">All clear</div>
              <div className="mt-1 text-xs text-muted-foreground">No expired, low-stock, or near-expiry items.</div>
            </div>
          ) : (
            alerts.map((a) => {
              const s = severityStyles[a.severity];
              const Icon = s.Icon;
              return (
                <div key={a.id} className={`flex items-center gap-4 border-l-4 px-5 py-3.5 ${s.row}`}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.iconWrap}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{a.name}</div>
                    <div className={`text-xs font-medium ${s.label}`}>{a.issue}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                    {a.value}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Recent table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Recently Added</h3>
            <p className="text-xs text-muted-foreground">Last 5 medicines added to inventory</p>
          </div>
          <Link to="/inventory" className="text-xs font-medium text-primary hover:underline">View all →</Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Medicine</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Expiry</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No medicines yet. Head to Inventory to add some.
                  </td>
                </tr>
              )}
              {recent.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.manufacturer}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{m.batchNumber}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{formatDate(m.expiryDate)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{m.quantity}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{formatCurrency(m.price)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={getMedicineStatus(m)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;