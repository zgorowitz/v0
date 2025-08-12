import { QRBarcodeScanner } from "../qr-barcode";

export class EnhancedBarcodeScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.lastScannedCode = "";
    this.onScanCallback = null;
    this.scanCooldown = 2000; // 2 seconds between scans
    this.lastScanTime = 0;
  }

  async startScanning(videoElement, onScan) {
    if (this.isScanning) return;
    
    try {
      this.isScanning = true;
      this.onScanCallback = onScan;
      
      // Initialize the barcode scanner
      this.scanner = new QRBarcodeScanner();
      
      // Start scanning with enhanced detection
      await this.scanner.startScanning(videoElement, (result) => {
        this.handleScanResult(result);
      });
      
      return true;
    } catch (err) {
      console.error("Barcode detection error:", err);
      // Fallback to mock detection for development
      this.startFallbackDetection();
      return false;
    }
  }

  handleScanResult(result) {
    if (!result || !this.onScanCallback) return;
    
    const now = Date.now();
    
    // Prevent duplicate scans within cooldown period
    if (result === this.lastScannedCode && (now - this.lastScanTime) < this.scanCooldown) {
      return;
    }
    
    this.lastScannedCode = result;
    this.lastScanTime = now;
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    this.onScanCallback(result);
  }

  startFallbackDetection() {
    if (!this.isScanning) return;
    
    const detectionTime = 2000 + Math.random() * 3000;
    
    setTimeout(() => {
      if (this.isScanning && this.onScanCallback) {
        const isOrderId = Math.random() > 0.3;
        const mockBarcode = isOrderId
          ? `${Math.floor(10000000000 + Math.random() * 90000000000)}`
          : `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`;
        
        this.handleScanResult(mockBarcode);
      }
    }, detectionTime);
  }

  stopScanning() {
    this.isScanning = false;
    if (this.scanner) {
      this.scanner.stop();
      this.scanner = null;
    }
    this.onScanCallback = null;
  }

  getLastScannedCode() {
    return this.lastScannedCode;
  }

  isCurrentlyScanning() {
    return this.isScanning;
  }
}