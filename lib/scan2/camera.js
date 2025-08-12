export class CameraManager {
  constructor() {
    this.streamRef = null;
    this.videoRef = null;
    this.flashlightOn = false;
  }

  async startCamera(videoElement) {
    try {
      this.videoRef = videoElement;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 }
        },
      });

      this.streamRef = stream;
      if (this.videoRef) {
        this.videoRef.srcObject = stream;
        return new Promise((resolve) => {
          this.videoRef.onloadedmetadata = () => resolve(stream);
        });
      }
      return stream;
    } catch (err) {
      console.error("Camera access error:", err);
      throw new Error("Cámara no disponible");
    }
  }

  stopCamera() {
    if (this.streamRef) {
      this.streamRef.getTracks().forEach((track) => track.stop());
      this.streamRef = null;
    }
    if (this.videoRef) {
      this.videoRef.srcObject = null;
    }
    this.flashlightOn = false;
  }

  async toggleFlashlight() {
    if (!this.streamRef) return false;

    try {
      const track = this.streamRef.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !this.flashlightOn }],
        });
        this.flashlightOn = !this.flashlightOn;
        return this.flashlightOn;
      } else {
        throw new Error("Linterna no disponible en este dispositivo");
      }
    } catch (err) {
      console.error("Flashlight error:", err);
      throw new Error("No se pudo activar la linterna");
    }
  }

  isFlashlightOn() {
    return this.flashlightOn;
  }

  getStream() {
    return this.streamRef;
  }
}