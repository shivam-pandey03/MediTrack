import { useEffect } from "react";
import emailjs from "emailjs-com";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { useAlerts } from "./alerts";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;
const STOCK_TEMPLATE = import.meta.env.VITE_EMAILJS_STOCK_TEMPLATE_ID as string;
const REPORT_TEMPLATE = import.meta.env.VITE_EMAILJS_REPORT_TEMPLATE_ID as string;

let initialized = false;
const initEmailJS = () => {
  if (!initialized && PUBLIC_KEY) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
};

const formatDDMMYYYY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useEmailScheduler = () => {
  const { profile } = useAuth();
  const alerts = useAlerts();

  useEffect(() => {
    if (!profile) return;
    initEmailJS();

    const tick = async () => {
      const now = new Date();
      // 03:30 UTC == 09:00 IST
      if (now.getUTCHours() !== 3 || now.getUTCMinutes() !== 30) return;
      const key = `lastEmailSent_${profile.pharmacyId}`;
      const last = localStorage.getItem(key);
      const today = todayKey();
      if (last === today) return;
      localStorage.setItem(key, today);

      const dateStr = formatDDMMYYYY(now);
      try {
        // Stock alert
        const hasAlerts =
          alerts.expired.length || alerts.nearExpiry.length || alerts.lowStock.length;
        if (hasAlerts) {
          const expired_list =
            alerts.expired.map((m) => m.name).join("\n") || "None";
          const near_expiry_list =
            alerts.nearExpiry.map(({ m, days }) => `${m.name} (${days} days)`).join("\n") || "None";
          const low_stock_list =
            alerts.lowStock.map((m) => `${m.name} (Qty: ${m.quantity})`).join("\n") || "None";
          await emailjs.send(SERVICE_ID, STOCK_TEMPLATE, {
            pharmacy_name: profile.pharmacyName,
            owner_name: profile.ownerName,
            owner_email: profile.email,
            date: dateStr,
            expired_list,
            near_expiry_list,
            low_stock_list,
          });
        }

        // Daily income report
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const billsSnap = await getDocs(
          query(
            collection(db, "bills"),
            where("pharmacyId", "==", profile.pharmacyId),
            where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
          ),
        );
        let totalSales = 0;
        let medicinesSold = 0;
        billsSnap.forEach((d) => {
          const data = d.data() as any;
          totalSales += Number(data.grandTotal || 0);
          if (Array.isArray(data.items)) {
            for (const it of data.items) medicinesSold += Number(it.quantity || 0);
          }
        });
        const totalProfit = totalSales * 0.2;
        await emailjs.send(SERVICE_ID, REPORT_TEMPLATE, {
          owner_name: profile.ownerName,
          owner_email: profile.email,
          date: dateStr,
          total_sales: totalSales.toFixed(2),
          total_profit: totalProfit.toFixed(2),
          total_bills: billsSnap.size,
          medicines_sold: medicinesSold,
        });
      } catch (err) {
        console.error("Email scheduler error:", err);
      }
    };

    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [profile, alerts]);
};
