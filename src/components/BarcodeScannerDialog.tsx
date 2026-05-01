import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
};

const REGION_ID = "barcode-scanner-region";

export const BarcodeScannerDialog = ({ open, onOpenChange, onDetected }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    const start = async () => {
      try {
        const formats = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ];
        const instance = new Html5Qrcode(REGION_ID, {
          verbose: false,
          formatsToSupport: formats,
        });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            if (cancelled) return;
            onDetected(decodedText);
          },
          () => {
            // ignore per-frame decode errors
          },
        );
        if (cancelled) {
          await instance.stop().catch(() => {});
        }
      } catch (err) {
        console.error("Scanner error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to access camera. Check permissions or enter the barcode manually.",
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    // Wait one frame so the region div is mounted
    const t = setTimeout(start, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst
          .stop()
          .then(() => inst.clear())
          .catch(() => {});
      }
    };
  }, [open, onDetected]);

  const submitManual = () => {
    const v = manualCode.trim();
    if (!v) return;
    onDetected(v);
    setManualCode("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setManualCode("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at the barcode on the medicine box.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            id={REGION_ID}
            className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted"
          />
          {starting && (
            <p className="text-xs text-muted-foreground">Starting camera…</p>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="manual-barcode" className="text-xs text-muted-foreground">
              Or enter barcode manually
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type barcode number"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitManual();
                  }
                }}
              />
              <Button type="button" onClick={submitManual} disabled={!manualCode.trim()}>
                Use
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};