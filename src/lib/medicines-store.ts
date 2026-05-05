import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";

export type Medicine = {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string; // ISO yyyy-mm-dd
  quantity: number;
  price: number;
  manufacturer: string;
  barcode?: string;
  createdAt: number;
  updatedAt: number;
};

export type MedicineInput = Omit<Medicine, "id" | "createdAt" | "updatedAt">;

export type MedicineStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "expired"
  | "near-expiry";

const COLLECTION = "medicines";

let state: Medicine[] = [];
const listeners = new Set<() => void>();
let unsubscribe: (() => void) | null = null;
let currentPharmacyId: string | null = null;

const toMillis = (v: unknown): number => {
  if (!v) return Date.now();
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "seconds" in (v as any)) {
    return (v as any).seconds * 1000;
  }
  return Date.now();
};

const startSubscription = (pharmacyId: string) => {
  if (unsubscribe && currentPharmacyId === pharmacyId) return;
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentPharmacyId = pharmacyId;
  state = [];
  listeners.forEach((l) => l());
  const q = query(
    collection(db, COLLECTION),
    where("pharmacyId", "==", pharmacyId),
    orderBy("createdAt", "desc"),
  );
  unsubscribe = onSnapshot(
    q,
    (snap) => {
      state = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          batchNumber: data.batchNumber ?? "",
          expiryDate: data.expiryDate ?? "",
          quantity: Number(data.quantity ?? 0),
          price: Number(data.price ?? 0),
          manufacturer: data.manufacturer ?? "",
          barcode: data.barcode ?? "",
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        } as Medicine;
      });
      listeners.forEach((l) => l());
    },
    (err) => {
      console.error("Firestore subscription error:", err);
    },
  );
};

export const setMedicinesPharmacy = (pharmacyId: string | null) => {
  if (!pharmacyId) {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    currentPharmacyId = null;
    state = [];
    listeners.forEach((l) => l());
    return;
  }
  startSubscription(pharmacyId);
};

export const useMedicines = (): Medicine[] => {
  const [snap, setSnap] = useState<Medicine[]>(state);
  useEffect(() => {
    const cb = () => setSnap(state);
    listeners.add(cb);
    cb();
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return snap;
};

const requirePharmacyId = () => {
  if (!currentPharmacyId) throw new Error("Not signed in");
  return currentPharmacyId;
};

export const addMedicine = async (input: MedicineInput) => {
  const pharmacyId = requirePharmacyId();
  await addDoc(collection(db, COLLECTION), {
    ...input,
    pharmacyId,
    ownerUid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateMedicine = async (id: string, input: MedicineInput) => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

export const updateMedicineQuantity = async (id: string, quantity: number) => {
  await updateDoc(doc(db, COLLECTION, id), {
    quantity,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMedicine = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
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
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
