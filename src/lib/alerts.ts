import { useMemo } from "react";
import { useMedicines, type Medicine } from "./medicines-store";

export type AlertType = "expired" | "near-expiry" | "low-stock" | "out-of-stock";

export type Alerts = {
  expired: Medicine[];
  nearExpiry: { m: Medicine; days: number }[];
  lowStock: Medicine[];
  outOfStock: Medicine[];
  total: number;
};

export const useAlerts = (): Alerts => {
  const medicines = useMedicines();
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expired: Medicine[] = [];
    const nearExpiry: { m: Medicine; days: number }[] = [];
    const lowStock: Medicine[] = [];
    const outOfStock: Medicine[] = [];
    for (const m of medicines) {
      const exp = new Date(m.expiryDate);
      const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
      if (!isNaN(days)) {
        if (days < 0) expired.push(m);
        else if (days <= 30) nearExpiry.push({ m, days });
      }
      if (m.quantity === 0) outOfStock.push(m);
      else if (m.quantity < 10) lowStock.push(m);
    }
    return {
      expired,
      nearExpiry,
      lowStock,
      outOfStock,
      total: expired.length + nearExpiry.length + lowStock.length + outOfStock.length,
    };
  }, [medicines]);
};
