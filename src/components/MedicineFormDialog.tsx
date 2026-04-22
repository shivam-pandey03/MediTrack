import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addMedicine, updateMedicine, type Medicine, type MedicineInput } from "@/lib/medicines-store";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Medicine | null;
};

const empty: MedicineInput = {
  name: "",
  batchNumber: "",
  expiryDate: "",
  quantity: 0,
  price: 0,
  manufacturer: "",
};

export const MedicineFormDialog = ({ open, onOpenChange, initial }: Props) => {
  const [form, setForm] = useState<MedicineInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof MedicineInput, string>>>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        initial
          ? {
              name: initial.name,
              batchNumber: initial.batchNumber,
              expiryDate: initial.expiryDate,
              quantity: initial.quantity,
              price: initial.price,
              manufacturer: initial.manufacturer,
            }
          : empty,
      );
    }
  }, [open, initial]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Required";
    else if (form.name.length > 100) e.name = "Too long";
    if (!form.batchNumber.trim()) e.batchNumber = "Required";
    if (!form.expiryDate) e.expiryDate = "Required";
    if (form.quantity < 0 || !Number.isFinite(form.quantity)) e.quantity = "Invalid";
    if (form.price < 0 || !Number.isFinite(form.price)) e.price = "Invalid";
    if (!form.manufacturer.trim()) e.manufacturer = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload: MedicineInput = {
      ...form,
      name: form.name.trim(),
      batchNumber: form.batchNumber.trim(),
      manufacturer: form.manufacturer.trim(),
      quantity: Number(form.quantity),
      price: Number(form.price),
    };
    if (initial) {
      updateMedicine(initial.id, payload);
      toast({ title: "Medicine updated", description: payload.name });
    } else {
      addMedicine(payload);
      toast({ title: "Medicine added", description: payload.name });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update the medicine details below." : "Fill in the details to add a new medicine to inventory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Medicine Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amoxicillin 500mg" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch">Batch Number</Label>
            <Input id="batch" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="AMX-500-01" />
            {errors.batchNumber && <p className="text-xs text-destructive">{errors.batchNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input id="expiry" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            {errors.expiryDate && <p className="text-xs text-destructive">{errors.expiryDate}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" min={0} step={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Price per unit ($)</Label>
            <Input id="price" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Cipla" />
            {errors.manufacturer && <p className="text-xs text-destructive">{errors.manufacturer}</p>}
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initial ? "Save Changes" : "Add Medicine"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};