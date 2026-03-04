import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose, scannerId, continuous = false }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [scanning, setScanning] = useState(false);
  const lastScanTimeRef = useRef(0);
  const hasFiredRef = useRef(false);
  const viewportId = scannerId || 'barcode-scanner-viewport';

  useEffect(() => {
    if (!manualMode) {
      startScanner();
    }
    return () => stopScanner();
  }, [manualMode]);

  const startScanner = async () => {
    try {
      // Longer delay to ensure DOM element is rendered (especially in modals)
      await new Promise((r) => setTimeout(r, 300));

      const el = document.getElementById(viewportId);
      if (!el) {
        console.error('Scanner viewport element not found:', viewportId);
        setCameraError(true);
        setManualMode(true);
        return;
      }

      const html5Qrcode = new Html5Qrcode(viewportId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 120 },
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        (decodedText) => {
          // Prevent multiple firings — only allow one scan result
          if (hasFiredRef.current && !continuous) return;
          const now = Date.now();
          if (now - lastScanTimeRef.current < 2000) return;
          lastScanTimeRef.current = now;

          // Vibrate for feedback
          if (navigator.vibrate) navigator.vibrate(100);

          setLastScanned(decodedText);

          if (continuous) {
            // In continuous mode, just call onScan and keep scanning
            onScan(decodedText);
            setTimeout(() => setLastScanned(''), 1500);
          } else {
            // Single-scan mode: stop scanner immediately to prevent further callbacks
            hasFiredRef.current = true;
            stopScanner().then(() => {
              onScan(decodedText);
            });
          }
        },
        () => {
          // Ignore scan failures (no barcode in frame)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setCameraError(true);
      setManualMode(true);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  if (manualMode) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16 }}>Enter Barcode</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {!cameraError && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setManualMode(false)}
                style={{ width: 'auto' }}
              >
                <Camera size={16} /> Camera
              </button>
            )}
            {onClose && (
              <button className="modal-close" onClick={onClose}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <form onSubmit={handleManualSubmit}>
          <div className="input-group">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Type or scan barcode..."
              autoFocus
              inputMode="numeric"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Look Up Product
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div
          id={viewportId}
          ref={containerRef}
          style={{ width: '100%', maxHeight: 300, borderRadius: 12, overflow: 'hidden' }}
        />

        {/* Scan success overlay */}
        {lastScanned && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--success)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <CheckCircle size={16} /> Scanned: {lastScanned}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-outline"
          onClick={() => { stopScanner(); setManualMode(true); }}
          style={{ flex: 1 }}
        >
          <Keyboard size={16} /> Manual Entry
        </button>
        {onClose && (
          <button
            className="btn btn-outline"
            onClick={() => { stopScanner(); onClose(); }}
            style={{ flex: 1 }}
          >
            <X size={16} /> Close
          </button>
        )}
      </div>
    </div>
  );
}
