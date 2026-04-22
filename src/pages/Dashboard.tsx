import { useMemo } from "react";
import { Package, AlertTriangle, CalendarClock, PackageX, ArrowUpRight } from "lucide-react";
import { useMedicines, getMedicineStatus, formatDate, formatCurrency } from "@/lib/medicines-store";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const medicines = useMedicines();

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
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back, Dr. Vance</h2>
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