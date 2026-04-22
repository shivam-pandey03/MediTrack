import { cn } from "@/lib/utils";
import type { MedicineStatus } from "@/lib/medicines-store";

const config: Record<MedicineStatus, { label: string; className: string; dot: string }> = {
  "in-stock": {
    label: "In Stock",
    className: "bg-success-soft text-success ring-success/20",
    dot: "bg-success",
  },
  "low-stock": {
    label: "Low Stock",
    className: "bg-warning-soft text-warning ring-warning/20",
    dot: "bg-warning",
  },
  "near-expiry": {
    label: "Near Expiry",
    className: "bg-warning-soft text-warning ring-warning/20",
    dot: "bg-warning",
  },
  "out-of-stock": {
    label: "Out of Stock",
    className: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground",
  },
};

export const StatusBadge = ({ status }: { status: MedicineStatus }) => {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        c.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
};