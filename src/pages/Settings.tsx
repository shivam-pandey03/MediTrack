import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-6">
    <h2 className="mb-5 text-base font-semibold">{title}</h2>
    {children}
  </section>
);

const Settings = () => {
  const { profile, refresh } = useAuth();
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPharmacyName(profile.pharmacyName || "");
    setOwnerName(profile.ownerName || "");
    setCity(profile.city || "");
    const p = (profile as any).preferences;
    if (p) {
      setLowStockThreshold(Number(p.lowStockThreshold ?? 10));
      setOpeningTime(p.openingTime ?? "09:00");
      setClosingTime(p.closingTime ?? "21:00");
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "pharmacies", profile.uid), {
        pharmacyName,
        ownerName,
        city,
      });
      await refresh();
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Failed to update", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePwd = async () => {
    if (!auth.currentUser?.email) return;
    if (newPwd.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPwd);
      toast({ title: "Password updated" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast({ title: "Failed to update password", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingPwd(false);
    }
  };

  const savePrefs = async () => {
    if (!profile) return;
    setSavingPrefs(true);
    try {
      await updateDoc(doc(db, "pharmacies", profile.uid), {
        preferences: {
          lowStockThreshold: Number(lowStockThreshold) || 10,
          openingTime,
          closingTime,
        },
      });
      await refresh();
      toast({ title: "Preferences saved" });
    } catch (err) {
      toast({ title: "Failed to save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="Pharmacy Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pharmacy Name</Label>
            <Input value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Owner Name</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} readOnly disabled />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Card title="Change Password">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={updatePwd} disabled={savingPwd}>
            {savingPwd ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </Card>

      <Card title="App Preferences">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Low Stock Threshold</Label>
            <Input
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Opening Time</Label>
            <Input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Closing Time</Label>
            <Input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={savePrefs} disabled={savingPrefs}>
            {savingPrefs ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
