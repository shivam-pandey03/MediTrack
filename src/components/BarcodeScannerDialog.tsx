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
    let activeStream: MediaStream | null = null;
    setError(null);
    setStarting(true);
    setScanning(false);

    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );

    const getStream = async (): Promise<MediaStream> => {
      const baseSize = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      };
      // 1) Preferred facing mode: environment on mobile, user on desktop.
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { ...baseSize, facingMode: { ideal: isMobile ? "environment" : "user" } },
          audio: false,
        });
      } catch (e1) {
        console.warn("Preferred camera failed, trying opposite facing mode", e1);
      }
      // 2) Fallback: opposite facing mode.
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { ...baseSize, facingMode: isMobile ? "user" : "environment" },
          audio: false,
        });
      } catch (e2) {
        console.warn("Opposite camera failed, trying any camera", e2);
      }
      // 3) Final fallback: any available camera.
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not available in this browser");
        }

        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100, // ~10 fps
          delayBetweenScanSuccess: 500,
        });

        if (!videoRef.current) return;

        activeStream = await getStream();
        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        videoRef.current.srcObject = activeStream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play().catch(() => {});

        const controls = await reader.decodeFromVideoElement(
          videoRef.current,
          (result, _err, ctrls) => {
            if (cancelled) {
              ctrls.stop();
              return;
            }
            if (result) {
              onDetected(result.getText());
            }
          },
        );

        const stopAll = () => {
          try { controls.stop(); } catch { /* noop */ }
          activeStream?.getTracks().forEach((t) => t.stop());
          activeStream = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        };
        controlsRef.current = { stop: stopAll } as IScannerControls;

        if (cancelled) {
          stopAll();
          return;
        }
        setScanning(true);
      } catch (err) {
        console.error("Scanner error:", err);
        setError(
          err instanceof Error
            ? `${err.message}. Allow camera permission and try again, or enter the barcode manually.`
            : "Unable to access camera. Check permissions or enter the barcode manually.",
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    const t = setTimeout(start, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      const ctrls = controlsRef.current;
      controlsRef.current = null;
      if (ctrls) {
        try { ctrls.stop(); } catch { /* noop */ }
      }
      activeStream?.getTracks().forEach((t) => t.stop());
      activeStream = null;
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
              autoPlay
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
