import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
};

export const BarcodeScannerDialog = ({ open, onOpenChange, onDetected }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);
    setScanning(false);

    const start = async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.DATA_MATRIX,
        ]);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 500,
        });

        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err, ctrls) => {
            if (cancelled) {
              ctrls.stop();
              return;
            }
            if (result) {
              onDetected(result.getText());
            }
            // ignore per-frame decode errors (NotFoundException is normal)
          },
        );
        controlsRef.current = controls;
        if (cancelled) {
          controls.stop();
          return;
        }
        setScanning(true);
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

    // Wait one frame so the video element is mounted
    const t = setTimeout(start, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      const ctrls = controlsRef.current;
      controlsRef.current = null;
      if (ctrls) {
        try { ctrls.stop(); } catch { /* noop */ }
      }
      setScanning(false);
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
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover [filter:contrast(1.2)_brightness(1.1)]"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-3/4 rounded-md border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {scanning && (
              <div className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-foreground">
                Scanning…
              </div>
            )}
          </div>
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