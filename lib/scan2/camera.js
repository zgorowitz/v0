export class CameraManager {
  constructor() {
    this.streamRef = null;
    this.videoRef = null;
    this.flashlightOn = false;
    this.permissionState = 'unknown';
    this.onPermissionChange = null;
  }

  async startCamera(videoElement) {
    try {
      this.videoRef = videoElement;
      
      // Check permission state first
      await this.checkPermissionState();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 }
        },
      });

      this.streamRef = stream;
      this.permissionState = 'granted';
      
      if (this.videoRef) {
        this.videoRef.srcObject = stream;
        return new Promise((resolve) => {
          this.videoRef.onloadedmetadata = () => resolve(stream);
        });
      }
      return stream;
    } catch (err) {
      console.error("Camera access error:", err);
      
      // Handle specific permission errors
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionState = 'denied';
        this.startPermissionWatcher();
        throw new Error("Camera permission denied - Please allow camera access");
      } else if (err.name === 'NotFoundError') {
        this.permissionState = 'unavailable';
        throw new Error("Camera not found");
      } else {
        this.permissionState = 'error';
        throw new Error("Camera not available");
      }
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
    this.stopPermissionWatcher();
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

  async checkPermissionState() {
    if (!navigator.permissions) return;
    
    try {
      const permission = await navigator.permissions.query({ name: 'camera' });
      this.permissionState = permission.state;
      return permission.state;
    } catch (err) {
      console.warn("Could not check camera permission:", err);
      return 'unknown';
    }
  }

  startPermissionWatcher() {
    if (!navigator.permissions) return;
    
    // Clear any existing watcher
    this.stopPermissionWatcher();
    
    navigator.permissions.query({ name: 'camera' }).then(permission => {
      permission.addEventListener('change', () => {
        const oldState = this.permissionState;
        this.permissionState = permission.state;
        
        // If permission was granted after being denied, notify callback
        if (oldState === 'denied' && permission.state === 'granted' && this.onPermissionChange) {
          this.onPermissionChange('granted');
        }
      });
      
      this._permissionWatcher = permission;
    }).catch(err => {
      console.warn("Could not watch camera permission:", err);
    });
  }

  stopPermissionWatcher() {
    if (this._permissionWatcher) {
      this._permissionWatcher.removeEventListener('change');
      this._permissionWatcher = null;
    }
  }

  setPermissionChangeCallback(callback) {
    this.onPermissionChange = callback;
  }

  getPermissionState() {
    return this.permissionState;
  }
}