import { AlertTriangle, Clock, PackageX, PackageMinus, CheckCircle2 } from "lucide-react";
import { useAlerts } from "@/lib/alerts";
import { formatDate } from "@/lib/medicines-store";

const Section = ({
  title,
  color,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  color: string;
  icon: any;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-border bg-card p-5">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-4" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
        {count}
      </span>
    </div>
    {count === 0 ? (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-success" /> All clear ✅
      </div>
    ) : (
      <ul className="divide-y divide-border">{children}</ul>
    )}
  </section>
);

const Row = ({ left, right }: { left: string; right?: string }) => (
  <li className="flex items-center justify-between py-2.5 text-sm">
    <span className="font-medium">{left}</span>
    {right && <span className="text-muted-foreground">{right}</span>}
  </li>
);

const Notifications = () => {
  const a = useAlerts();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section
        title="Expired Medicines"
        color="bg-destructive/10 text-destructive"
        icon={AlertTriangle}
        count={a.expired.length}
      >
        {a.expired.map((m) => (
          <Row key={m.id} left={m.name} right={`Expired ${formatDate(m.expiryDate)}`} />
        ))}
      </Section>
      <Section
        title="Near Expiry (≤30 days)"
        color="bg-warning/15 text-warning"
        icon={Clock}
        count={a.nearExpiry.length}
      >
        {a.nearExpiry.map(({ m, days }) => (
          <Row key={m.id} left={m.name} right={`${days} day${days === 1 ? "" : "s"} left`} />
        ))}
      </Section>
      <Section
        title="Low Stock (<10)"
        color="bg-yellow-500/15 text-yellow-600"
        icon={PackageMinus}
        count={a.lowStock.length}
      >
        {a.lowStock.map((m) => (
          <Row key={m.id} left={m.name} right={`Qty: ${m.quantity}`} />
        ))}
      </Section>
      <Section
        title="Out of Stock"
        color="bg-destructive/10 text-destructive"
        icon={PackageX}
        count={a.outOfStock.length}
      >
        {a.outOfStock.map((m) => (
          <Row key={m.id} left={m.name} />
        ))}
      </Section>
    </div>
  );
};

export default Notifications;
