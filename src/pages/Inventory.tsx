import { useCallback, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { MedicineFormDialog } from "@/components/MedicineFormDialog";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { AddStockDialog } from "@/components/AddStockDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMedicines, deleteMedicine, getMedicineStatus, formatCurrency, formatDate, type Medicine, type MedicineInput } from "@/lib/medicines-store";
import { toast } from "@/hooks/use-toast";

const Inventory = () => {
  const medicines = useMedicines();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Medicine | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<MedicineInput> | null>(null);
  const [stockTarget, setStockTarget] = useState<Medicine | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    let list = medicines.filter((m) => !q || m.name.toLowerCase().includes(q));

    list = list.filter((m) => {
      const exp = new Date(m.expiryDate);
      switch (filter) {
        case "in-stock":
          return m.quantity >= 10;
        case "low-stock":
          return m.quantity > 0 && m.quantity < 10;
        case "out-of-stock":
          return m.quantity === 0;
        case "near-expiry":
          return exp >= today && exp <= in30;
        case "expired":
          return exp < today;
        default:
          return true;
      }
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "expiry") {
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      if (sort === "quantity") return a.quantity - b.quantity;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [medicines, query, filter, sort]);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (m: Medicine) => { setEditing(m); setDialogOpen(true); };

  const handleScanned = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setScannerOpen(false);
      const match = medicines.find((m) => (m.barcode ?? "") === trimmed);
      if (match) {
        setStockTarget(match);
        toast({ title: "Medicine found", description: `${match.name} — add to stock.` });
        return;
      } else {
        setEditing(null);
        setPrefill({ barcode: trimmed });
        toast({ title: "New barcode", description: "Fill in the medicine details." });
        setDialogOpen(true);
      }
    },
    [medicines],
  );

  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    const name = confirmDelete.name;
    try {
      await deleteMedicine(confirmDelete.id);
      toast({ title: "Medicine deleted", description: name });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Medicine Inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your full medicine catalog and stock levels.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={() => { setScannerOpen(true); }}>
            <ScanLine className="size-4" /> Scan Barcode
          </Button>
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add Medicine
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicines by name..."
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Medicines</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="near-expiry">Near Expiry</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name (A–Z)</SelectItem>
              <SelectItem value="expiry">Sort by Expiry (earliest)</SelectItem>
              <SelectItem value="quantity">Sort by Quantity (lowest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          <span className="font-medium text-foreground">{medicines.length}</span> medicines
        </div>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Batch No</th>
                <th className="px-5 py-3 font-semibold">Expiry Date</th>
                <th className="px-5 py-3 text-right font-semibold">Quantity</th>
                <th className="px-5 py-3 text-right font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="text-sm font-medium">No medicines found</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {query ? "Try a different search term." : "Get started by adding your first medicine."}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.manufacturer}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{m.batchNumber}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{formatDate(m.expiryDate)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium">{m.quantity}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{formatCurrency(m.price)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={getMedicineStatus(m)} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          <span className="font-medium text-foreground">{medicines.length}</span> medicines
        </div>
      </section>

      <MedicineFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setPrefill(null);
        }}
        initial={editing}
        prefill={prefill}
      />

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleScanned}
      />

      <AddStockDialog
        open={!!stockTarget}
        onOpenChange={(o) => { if (!o) setStockTarget(null); }}
        medicine={stockTarget}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirmDelete?.name}</strong> from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;