import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Loader2, MapPin, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Pharmacy = {
  id: string;
  pharmacyName: string;
  ownerName: string;
  city: string;
  latitude: number;
  longitude: number;
};

type NearbyResult = Pharmacy & { distance: number; available?: boolean };

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const NearbyPharmacies = () => {
  const { profile } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const [nearby, setNearby] = useState<NearbyResult[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (profile?.latitude && profile?.longitude) {
        setCoords({ lat: profile.latitude, lng: profile.longitude });
      } else {
        setLocDenied(true);
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        if (profile?.latitude && profile?.longitude) {
          setCoords({ lat: profile.latitude, lng: profile.longitude });
        } else {
          setLocDenied(true);
        }
      },
    );
  }, [profile?.latitude, profile?.longitude]);

  useEffect(() => {
    const load = async () => {
      if (!coords || !profile) return;
      setLoadingNearby(true);
      try {
        const snap = await getDocs(collection(db, "pharmacies"));
        const results: NearbyResult[] = [];
        snap.forEach((d) => {
          if (d.id === profile.uid) return;
          const data = d.data() as any;
          if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return;
          const distance = haversine(coords.lat, coords.lng, data.latitude, data.longitude);
          if (distance <= 10) {
            results.push({
              id: d.id,
              pharmacyName: data.pharmacyName ?? "",
              ownerName: data.ownerName ?? "",
              city: data.city ?? "",
              latitude: data.latitude,
              longitude: data.longitude,
              distance,
            });
          }
        });
        results.sort((a, b) => a.distance - b.distance);
        setNearby(results);
      } finally {
        setLoadingNearby(false);
      }
    };
    load();
  }, [coords, profile]);

  const handleSearch = async () => {
    const term = search.trim().toLowerCase();
    if (!term) return;
    setSearching(true);
    setSearched(true);
    try {
      const updated = await Promise.all(
        nearby.map(async (ph) => {
          const q = query(collection(db, "medicines"), where("pharmacyId", "==", ph.id));
          const snap = await getDocs(q);
          let available = false;
          snap.forEach((d) => {
            const data = d.data() as any;
            const name = String(data.name ?? "").toLowerCase();
            const qty = Number(data.quantity ?? 0);
            if (name.includes(term) && qty > 0) available = true;
          });
          return { ...ph, available };
        }),
      );
      setNearby(updated);
    } finally {
      setSearching(false);
    }
  };

  if (locDenied) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <MapPin className="size-6" />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Please allow location access to use this feature
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nearby Pharmacies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check medicine availability in pharmacies within 10 km.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search medicine name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={!coords || searching || !search.trim()}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {!coords || loadingNearby ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Locating nearby pharmacies...
        </div>
      ) : nearby.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No pharmacies found nearby
        </div>
      ) : !searched ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Search for a medicine to see nearby pharmacy availability
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map((ph) => (
            <Card key={ph.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{ph.pharmacyName}</div>
                    <div className="text-xs text-muted-foreground">{ph.ownerName}</div>
                  </div>
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset " +
                      (ph.available
                        ? "bg-success-soft text-success ring-success/20"
                        : "bg-destructive/10 text-destructive ring-destructive/20")
                    }
                  >
                    {ph.available ? "Available" : "Not Available"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{ph.city}</span>
                  <span className="ml-auto font-medium text-foreground">
                    {ph.distance.toFixed(1)} km away
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyPharmacies;