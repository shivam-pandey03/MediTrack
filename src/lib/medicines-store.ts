import { useSyncExternalStore } from "react";

export type Medicine = {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string; // ISO yyyy-mm-dd
  quantity: number;
  price: number;
  manufacturer: string;
  createdAt: number;
  updatedAt: number;
};

export type MedicineInput = Omit<Medicine, "id" | "createdAt" | "updatedAt">;

export type MedicineStatus = "in-stock" | "low-stock" | "out-of-stock" | "expired" | "near-expiry";

const STORAGE_KEY = "meditrack:medicines";

const seed = (): Medicine[] => {
  const now = Date.now();
  const day = 86400000;
  const iso = (offset: number) =>
    new Date(now + offset * day).toISOString().slice(0, 10);
  return [
    { id: "m1", name: "Amoxicillin", batchNumber: "AMX-500-01", expiryDate: iso(420), quantity: 240, price: 0.45, manufacturer: "Cipla", createdAt: now - 9 * day, updatedAt: now - 9 * day },
    { id: "m2", name: "Lisinopril 10mg", batchNumber: "LIS-010-22", expiryDate: iso(15), quantity: 6, price: 0.18, manufacturer: "Sun Pharma", createdAt: now - 7 * day, updatedAt: now - 2 * day },
    { id: "m3", name: "Atorvastatin 40mg", batchNumber: "ATV-040-09", expiryDate: iso(620), quantity: 1820, price: 0.32, manufacturer: "Pfizer", createdAt: now - 5 * day, updatedAt: now - 1 * day },
    { id: "m4", name: "Metformin 500mg", batchNumber: "MET-500-14", expiryDate: iso(-3), quantity: 80, price: 0.12, manufacturer: "Teva", createdAt: now - 30 * day, updatedAt: now - 30 * day },
    { id: "m5", name: "Salbutamol Inhaler", batchNumber: "SAL-100-07", expiryDate: iso(28), quantity: 0, price: 8.5, manufacturer: "GSK", createdAt: now - 4 * day, updatedAt: now - 4 * day },
    { id: "m6", name: "Omeprazole 20mg", batchNumber: "OMP-020-31", expiryDate: iso(380), quantity: 540, price: 0.22, manufacturer: "Dr. Reddy's", createdAt: now - 3 * day, updatedAt: now - 3 * day },
    { id: "m7", name: "Paracetamol 500mg", batchNumber: "PCM-500-44", expiryDate: iso(210), quantity: 4, price: 0.05, manufacturer: "Cipla", createdAt: now - 2 * day, updatedAt: now - 2 * day },
    { id: "m8", name: "Ibuprofen 400mg", batchNumber: "IBU-400-12", expiryDate: iso(95), quantity: 320, price: 0.09, manufacturer: "Hetero", createdAt: now - 1 * day, updatedAt: now - 1 * day },
  ];
};

const load = (): Medicine[] => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Medicine[];
  } catch {
    return seed();
  }
};

let state: Medicine[] = load();
const listeners = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = () => state;

export const useMedicines = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const addMedicine = (input: MedicineInput) => {
  const now = Date.now();
  state = [
    { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now },
    ...state,
  ];
  persist();
};

export const updateMedicine = (id: string, input: MedicineInput) => {
  state = state.map((m) =>
    m.id === id ? { ...m, ...input, updatedAt: Date.now() } : m,
  );
  persist();
};

export const deleteMedicine = (id: string) => {
  state = state.filter((m) => m.id !== id);
  persist();
};

export const getMedicineStatus = (m: Medicine): MedicineStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(m.expiryDate);
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (m.quantity === 0) return "out-of-stock";
  if (diffDays <= 30) return "near-expiry";
  if (m.quantity < 10) return "low-stock";
  return "in-stock";
};

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });