import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateMedicineQuantity, type Medicine } from "@/lib/medicines-store";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
};

export const AddStockDialog = ({ open, onOpenChange, medicine }: Props) => {
  const [addQty, setAddQty] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAddQty(1);
      setSaving(false);
    }
  }, [open, medicine?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine) return;
    const add = Number(addQty);
    if (!Number.isFinite(add) || add <= 0) {
      toast({ title: "Invalid quantity", description: "Enter a positive number.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateMedicineQuantity(medicine.id, medicine.quantity + add);
      toast({ title: "Stock updated successfully", description: `${medicine.name}: +${add}` });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Stock</DialogTitle>
          <DialogDescription>This medicine already exists. Add more units to current stock.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Medicine Name</div>
            <div className="font-medium text-foreground">{medicine?.name ?? "—"}</div>
            <div className="mt-2 text-xs text-muted-foreground">Current Stock</div>
            <div className="font-medium tabular-nums">{medicine?.quantity ?? 0}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-qty">Add Stock Quantity</Label>
            <Input
              id="add-qty"
              type="number"
              min={1}
              step={1}
              value={addQty}
              autoFocus
              onChange={(e) => setAddQty(Number(e.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add to Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
