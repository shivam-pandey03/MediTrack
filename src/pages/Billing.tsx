import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Receipt, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMedicines, formatCurrency, type Medicine } from "@/lib/medicines-store";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

type CartItem = {
  medicineId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  available: number;
};

type GeneratedBill = {
  billId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  grandTotal: number;
  date: Date;
};

const Billing = () => {
  const medicines = useMedicines();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bill, setBill] = useState<GeneratedBill | null>(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return medicines.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [medicines, search]);

  const pickMedicine = (m: Medicine) => {
    setSelected(m);
    setSearch(m.name);
    setQty(1);
  };

  const addToCart = () => {
    if (!selected) {
      toast({ title: "Select a medicine first", variant: "destructive" });
      return;
    }
    if (qty <= 0) {
      toast({ title: "Quantity must be greater than 0", variant: "destructive" });
      return;
    }
    if (qty > selected.quantity) {
      toast({ title: "Not enough stock", description: `Only ${selected.quantity} available`, variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.medicineId === selected.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > selected.quantity) {
          toast({ title: "Not enough stock", variant: "destructive" });
          return prev;
        }
        return prev.map((i) =>
          i.medicineId === selected.id ? { ...i, quantity: newQty } : i,
        );
      }
      return [
        ...prev,
        {
          medicineId: selected.id,
          name: selected.name,
          unitPrice: selected.price,
          quantity: qty,
          available: selected.quantity,
        },
      ];
    });
    setSelected(null);
    setSearch("");
    setQty(1);
  };

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((i) => i.medicineId !== id));

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount = (subtotal * (Number(discount) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const generateBill = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Reduce stock
      await Promise.all(
        cart.map((item) => {
          const med = medicines.find((m) => m.id === item.medicineId);
          const newQty = Math.max(0, (med?.quantity ?? item.available) - item.quantity);
          return updateDoc(doc(db, "medicines", item.medicineId), {
            quantity: newQty,
            updatedAt: serverTimestamp(),
          });
        }),
      );

      const billDoc = await addDoc(collection(db, "bills"), {
        pharmacyId: profile?.pharmacyId ?? null,
        items: cart.map((i) => ({
          medicineId: i.medicineId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          total: i.unitPrice * i.quantity,
        })),
        subtotal,
        discount: Number(discount) || 0,
        discountAmount,
        grandTotal,
        createdAt: serverTimestamp(),
      });

      setBill({
        billId: billDoc.id,
        items: cart,
        subtotal,
        discount: Number(discount) || 0,
        discountAmount,
        grandTotal,
        date: new Date(),
      });
      setCart([]);
      setDiscount(0);
      toast({ title: "Bill generated", description: `#${billDoc.id.slice(-6).toUpperCase()}` });
    } catch (err) {
      toast({
        title: "Failed to generate bill",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const printBill = () => window.print();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create invoices and update stock instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: search + cart */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">Add Medicine</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Search medicine by name..."
                  className="pl-9"
                />
                {search && !selected && matches.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                    {matches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => pickMedicine(m)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {m.quantity}
                          </div>
                        </div>
                        <div className="text-sm tabular-nums">{formatCurrency(m.price)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-full sm:w-32">
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  placeholder="Qty"
                />
              </div>
              <Button onClick={addToCart} disabled={!selected}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {selected && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-primary-soft px-3 py-2 text-xs text-primary">
                Selected: <strong>{selected.name}</strong> · Unit{" "}
                {formatCurrency(selected.price)} · Available {selected.quantity}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">Cart</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Medicine</th>
                    <th className="px-5 py-3 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3 text-right font-semibold">Unit Price</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                        Cart is empty. Search and add medicines above.
                      </td>
                    </tr>
                  )}
                  {cart.map((i) => (
                    <tr key={i.medicineId}>
                      <td className="px-5 py-3 font-medium">{i.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{i.quantity}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(i.unitPrice)}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(i.unitPrice * i.quantity)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => removeItem(i.medicineId)}
                          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: summary */}
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold">Summary</h3>

          <div className="space-y-1.5">
            <Label htmlFor="discount" className="text-xs">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums text-destructive">
                −{formatCurrency(discountAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Button
            onClick={generateBill}
            disabled={submitting || cart.length === 0}
            className="w-full"
          >
            <Receipt className="size-4" />
            {submitting ? "Generating..." : "Generate Bill"}
          </Button>
        </aside>
      </div>

      {bill && <BillReceipt bill={bill} onClose={() => setBill(null)} onPrint={printBill} />}
    </div>
  );
};

const BillReceipt = ({
  bill,
  onClose,
  onPrint,
}: {
  bill: GeneratedBill;
  onClose: () => void;
  onPrint: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl print:max-w-none print:rounded-none print:shadow-none" id="bill-print-area">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted print:hidden"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="border-b border-border pb-4 text-center">
          <div className="text-2xl font-bold tracking-tight text-primary">MediTrack 💊</div>
          <div className="text-xs text-muted-foreground">Pharmacy Invoice</div>
        </div>

        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <div>
            Bill #: <span className="font-mono text-foreground">{bill.billId.slice(-8).toUpperCase()}</span>
          </div>
          <div>
            {bill.date.toLocaleDateString()} {bill.date.toLocaleTimeString()}
          </div>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bill.items.map((i) => (
              <tr key={i.medicineId}>
                <td className="py-2">{i.name}</td>
                <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(i.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(i.unitPrice * i.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount ({bill.discount}%)</span>
            <span className="tabular-nums">−{formatCurrency(bill.discountAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCurrency(bill.grandTotal)}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Thank you for shopping with MediTrack.
        </div>

        <div className="mt-6 flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onPrint}>
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Billing;
