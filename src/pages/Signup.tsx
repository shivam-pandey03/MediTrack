import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Pill } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("admin");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast({ title: "Location detected" });
      },
      (err) => {
        setLocating(false);
        toast({
          title: "Could not detect location",
          description: err.message,
          variant: "destructive",
        });
      },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "pharmacies", uid), {
        pharmacyId: uid,
        pharmacyName: pharmacyName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        city: city.trim(),
        latitude: lat,
        longitude: lng,
        role,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Pharmacy registered" });
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Pill className="size-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            MediTrack <span className="text-primary">💊</span>
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Register your pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create an account to get started.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pharmacy">Pharmacy Name</Label>
            <Input id="pharmacy" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner">Owner Name</Label>
            <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (Owner)</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>GPS Location</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={detectLocation} disabled={locating}>
                <MapPin className="size-4" /> {locating ? "Detecting..." : "Detect My Location"}
              </Button>
              {lat !== null && lng !== null && (
                <span className="text-xs text-muted-foreground">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;