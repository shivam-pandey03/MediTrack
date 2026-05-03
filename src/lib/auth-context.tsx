import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type PharmacyRole = "admin" | "staff";

export type PharmacyProfile = {
  uid: string;
  pharmacyId: string;
  pharmacyName: string;
  ownerName: string;
  email: string;
  city: string;
  latitude?: number;
  longitude?: number;
  role: PharmacyRole;
};

type AuthState = {
  user: User | null;
  profile: PharmacyProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

const loadProfile = async (user: User): Promise<PharmacyProfile | null> => {
  const snap = await getDoc(doc(db, "pharmacies", user.uid));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    uid: user.uid,
    pharmacyId: data.pharmacyId ?? user.uid,
    pharmacyName: data.pharmacyName ?? "",
    ownerName: data.ownerName ?? "",
    email: data.email ?? user.email ?? "",
    city: data.city ?? "",
    latitude: data.latitude,
    longitude: data.longitude,
    role: (data.role as PharmacyRole) ?? "admin",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await loadProfile(u);
          setProfile(p);
        } catch (err) {
          console.error("Failed to load profile", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refresh = async () => {
    if (auth.currentUser) {
      const p = await loadProfile(auth.currentUser);
      setProfile(p);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <Ctx.Provider value={{ user, profile, loading, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);