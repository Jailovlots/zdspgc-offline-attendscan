import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QrScannerComponent = ({ onScanSuccess, onScanError }: QrScannerComponentProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear")
          );
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        } else {
          setError("No cameras found on this device.");
        }
      })
      .catch((err) => {
        setError("Could not access cameras. Please allow camera permission.");
        console.error("Camera error:", err);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCamera) return;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          // Don't stop — let the parent decide
        },
        (errorMessage) => {
          // Ignore scan failures (no QR in frame)
        }
      );
      setIsStarted(true);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to start scanner");
      onScanError?.(err?.message || "Failed to start scanner");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isStarted) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      setIsStarted(false);
    }
  };

  const switchCamera = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isStarted) {
      await stopScanner();
      // Re-start will be triggered by button
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg w-full text-center">
          {error}
        </div>
      )}

      <div
        id="qr-reader"
        className="w-full max-w-md rounded-xl overflow-hidden border-2 border-border bg-muted"
        style={{ minHeight: isStarted ? "auto" : "300px" }}
      />

      {cameras.length > 1 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => switchCamera(cam.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedCamera === cam.id
                  ? "bg-gold text-gold-foreground border-gold"
                  : "bg-muted text-muted-foreground border-border hover:border-gold/50"
              }`}
            >
              {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {!isStarted ? (
          <button
            onClick={startScanner}
            disabled={!selectedCamera}
            className="px-6 py-2.5 bg-gold text-gold-foreground font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="px-6 py-2.5 bg-destructive text-destructive-foreground font-semibold rounded-lg hover:bg-destructive/90 transition-colors"
          >
            Stop Scanner
          </button>
        )}
      </div>
    </div>
  );
};

export default QrScannerComponent;
