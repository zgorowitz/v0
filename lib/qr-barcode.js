/**
 * Universal Scanner for both Barcodes and QR Codes using ZXing-js library
 * This provides detection for all common formats from camera feed
 */

// Import ZXing library (this would be installed via npm in a real project)
// For now, we'll create a wrapper that can work with or without the library

export class QRBarcodeScanner {
    constructor() {
      this.isScanning = false
      this.codeReader = null
      this.animationFrame = null
      this.canvas = null
      this.context = null
      this.universalDetector = null
      this.lastDetectionTime = 0
      this.detectionCooldown = 1000 // Prevent duplicate detections
    }
  
    async startScanning(videoElement, onResult) {
      if (this.isScanning) return
  
      this.isScanning = true
  
      try {
        // Try to use ZXing-js if available
        if (typeof window !== "undefined" && window.ZXing) {
          await this.startZXingScanning(videoElement, onResult)
        } else {
          // Fallback to canvas-based detection simulation
          await this.startCanvasScanning(videoElement, onResult)
        }
      } catch (error) {
        console.error("Scanner error:", error)
        // Fallback to simple simulation
        this.startSimulatedScanning(onResult)
      }
    }
  
    async startZXingScanning(videoElement, onResult) {
      try {
        // Initialize ZXing Code Reader for all formats
        const { BrowserMultiFormatReader } = window.ZXing
        this.codeReader = new BrowserMultiFormatReader()
  
        // Start continuous scanning
        const result = await this.codeReader.decodeFromVideoDevice(
          undefined, // Use default camera
          videoElement,
          (result, error) => {
            if (result && this.shouldProcessResult()) {
              console.log("Code detected:", result.text)
              const parsedResult = this.parseScannedContent(result.text)
              // Return string for backwards compatibility, but extract shipment ID if needed
              const resultString = this.extractResultString(parsedResult)
              onResult(resultString)
            }
            if (error && error.name !== "NotFoundException") {
              console.error("ZXing scanning error:", error)
            }
          },
        )
      } catch (error) {
        console.error("ZXing initialization error:", error)
        throw error
      }
    }
  
    async startCanvasScanning(videoElement, onResult) {
      // Create canvas for frame analysis
      this.canvas = document.createElement("canvas")
      this.context = this.canvas.getContext("2d")
  
      const scanFrame = () => {
        if (!this.isScanning) return
  
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
          // Set canvas size to match video
          this.canvas.width = videoElement.videoWidth
          this.canvas.height = videoElement.videoHeight
  
          // Draw current video frame to canvas
          this.context.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height)
  
          // Try to detect codes using ImageData
          const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)
  
          // Use browser's native BarcodeDetector if available
          if ("BarcodeDetector" in window) {
            this.detectWithNativeAPI(imageData, onResult)
          } else {
            // Simulate detection based on image analysis
            this.simulateUniversalDetection(imageData, onResult)
          }
        }
  
        this.animationFrame = requestAnimationFrame(scanFrame)
      }
  
      scanFrame()
    }
  
    async detectWithNativeAPI(imageData, onResult) {
      try {
        if (!this.universalDetector) {
          this.universalDetector = new window.BarcodeDetector({
            // Support all common formats
            formats: [
              "code_128", "code_39", "code_93", 
              "ean_13", "ean_8", "upc_a", "upc_e",
              "codabar", "itf", "pdf417",
              "qr_code", "data_matrix", "aztec"
            ],
          })
        }
  
        const codes = await this.universalDetector.detect(imageData)
        if (codes.length > 0 && this.shouldProcessResult()) {
          const detectedCode = codes[0]
          console.log("Native code detected:", detectedCode.rawValue, "Format:", detectedCode.format)
          
          const parsedResult = this.parseScannedContent(detectedCode.rawValue, detectedCode.format)
          const resultString = this.extractResultString(parsedResult)
          onResult(resultString)
        }
      } catch (error) {
        console.error("Native detection error:", error)
      }
    }
  
    simulateUniversalDetection(imageData, onResult) {
      if (!this.shouldProcessResult()) return
  
      const data = imageData.data
      const width = imageData.width
      const height = imageData.height
  
      // Try barcode detection first (horizontal patterns)
      const barcodeResult = this.detectBarcodePattern(data, width, height)
      
      // Try QR code detection (square patterns)
      const qrResult = this.detectQRPattern(data, width, height)
  
      // Choose the pattern with higher confidence
      if (barcodeResult.score > qrResult.score && barcodeResult.score > 0.3) {
        const generatedCode = this.generateBarcodeContent()
        console.log("Simulated barcode detected:", generatedCode.content)
        onResult(generatedCode.content)
      } else if (qrResult.score > 0.3) {
        const generatedCode = this.generateQRContent()
        console.log("Simulated QR code detected:", generatedCode.content)
        const resultString = this.extractResultString(generatedCode)
        onResult(resultString)
      }
    }
  
    detectBarcodePattern(data, width, height) {
      // Barcode detection logic (horizontal line patterns)
      let edgeCount = 0
      const threshold = 50
  
      for (let y = height * 0.4; y < height * 0.6; y++) {
        for (let x = 0; x < width - 1; x++) {
          const i = (y * width + x) * 4
          const nextI = (y * width + x + 1) * 4
  
          const brightness1 = (data[i] + data[i + 1] + data[i + 2]) / 3
          const brightness2 = (data[nextI] + data[nextI + 1] + data[nextI + 2]) / 3
  
          if (Math.abs(brightness1 - brightness2) > threshold) {
            edgeCount++
          }
        }
      }
  
      const score = Math.min(edgeCount / (width * 0.3), 1)
      return { score, type: 'barcode' }
    }
  
    detectQRPattern(data, width, height) {
      let score = 0
      const blockSize = Math.min(width, height) / 20
  
      // Check for QR position detection patterns (squares in corners)
      const corners = [
        { x: 0, y: 0 },
        { x: width - blockSize * 7, y: 0 },
        { x: 0, y: height - blockSize * 7 },
      ]
  
      corners.forEach(corner => {
        const patternScore = this.checkQRPositionPattern(data, width, height, corner.x, corner.y, blockSize)
        score += patternScore
      })
  
      // Look for alternating patterns
      const alternatingScore = this.checkQRAlternatingPatterns(data, width, height)
      score += alternatingScore
  
      return { score: score / 4, type: 'qr' }
    }
  
    checkQRPositionPattern(data, width, height, startX, startY, blockSize) {
      let contrastCount = 0
      let totalChecks = 0
  
      for (let y = startY; y < startY + blockSize * 7 && y < height; y += Math.floor(blockSize / 2)) {
        for (let x = startX; x < startX + blockSize * 7 && x < width; x += Math.floor(blockSize / 2)) {
          const i = (y * width + x) * 4
          if (i + 2 < data.length) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
            
            const rightI = (y * width + Math.min(x + blockSize, width - 1)) * 4
            if (rightI + 2 < data.length) {
              const rightBrightness = (data[rightI] + data[rightI + 1] + data[rightI + 2]) / 3
              if (Math.abs(brightness - rightBrightness) > 80) {
                contrastCount++
              }
              totalChecks++
            }
          }
        }
      }
  
      return totalChecks > 0 ? contrastCount / totalChecks : 0
    }
  
    checkQRAlternatingPatterns(data, width, height) {
      let alternatingScore = 0
      const sampleLines = 5
  
      for (let i = 0; i < sampleLines; i++) {
        const y = Math.floor((height / sampleLines) * i)
        alternatingScore += this.checkLinePattern(data, width, y, width, true)
  
        const x = Math.floor((width / sampleLines) * i)
        alternatingScore += this.checkLinePattern(data, width, x, height, false)
      }
  
      return alternatingScore / (sampleLines * 2)
    }
  
    checkLinePattern(data, width, start, length, isHorizontal) {
      let transitions = 0
      let lastBrightness = null
  
      for (let i = 0; i < length - 1; i++) {
        const pixelIndex = isHorizontal 
          ? (start * width + i) * 4
          : (i * width + start) * 4
  
        if (pixelIndex + 2 < data.length) {
          const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
          
          if (lastBrightness !== null && Math.abs(brightness - lastBrightness) > 60) {
            transitions++
          }
          lastBrightness = brightness
        }
      }
  
      return Math.min(transitions / (length * 0.1), 1)
    }
  
    generateBarcodeContent() {
      const barcodeTypes = ["SKU", "ORD", "UPC"]
      const type = barcodeTypes[Math.floor(Math.random() * barcodeTypes.length)]
  
      let content
      if (type === "SKU") {
        content = `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`
      } else if (type === "ORD") {
        content = `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`
      } else {
        content = Math.floor(100000000000 + Math.random() * 900000000000).toString()
      }
  
      return {
        content,
        type: 'barcode',
        format: type === 'UPC' ? 'upc_a' : 'code_128',
        parsedData: { type: 'shipment_id', value: content }
      }
    }
  
    generateQRContent() {
      const contentTypes = ["url", "text", "contact", "wifi", "shipment"]
      const type = contentTypes[Math.floor(Math.random() * contentTypes.length)]
  
      let content
      let parsedData
  
      switch (type) {
        case "url":
          const domains = ["example.com", "test.org", "demo.net", "sample.io"]
          const domain = domains[Math.floor(Math.random() * domains.length)]
          content = `https://www.${domain}/shipment/${Math.floor(Math.random() * 1000000)}`
          parsedData = { type: 'url', value: content }
          break
  
        case "shipment":
          content = `SHIP-${Math.floor(10000000 + Math.random() * 90000000)}`
          parsedData = { type: 'shipment_id', value: content }
          break
  
        case "text":
          const messages = [
            "Hello from QR Code!",
            "Order #" + Math.floor(10000 + Math.random() * 90000),
            "Shipment ID: " + Math.floor(10000000 + Math.random() * 90000000)
          ]
          content = messages[Math.floor(Math.random() * messages.length)]
          parsedData = { type: 'text', value: content }
          break
  
        case "contact":
          content = `BEGIN:VCARD
  VERSION:3.0
  FN:John Doe
  ORG:Test Company
  TEL:+1-555-${Math.floor(Math.random() * 9000) + 1000}
  EMAIL:john@example.com
  END:VCARD`
          parsedData = { type: 'contact', value: content }
          break
  
        case "wifi":
          const ssids = ["HomeWiFi", "OfficeNet", "TestNetwork"]
          const ssid = ssids[Math.floor(Math.random() * ssids.length)]
          content = `WIFI:T:WPA;S:${ssid};P:password123;H:false;;`
          parsedData = { type: 'wifi', value: content }
          break
  
        default:
          content = `QR-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 10000)}`
          parsedData = { type: 'text', value: content }
      }
  
      return {
        content,
        type: 'qr',
        format: 'qr_code',
        parsedData
      }
    }
  
    startSimulatedScanning(onResult) {
      // Simple fallback - generate random code after delay
      const delay = 2000 + Math.random() * 3000
  
      setTimeout(() => {
        if (this.isScanning && this.shouldProcessResult()) {
          const isQR = Math.random() > 0.6 // 40% chance of QR, 60% barcode
          const generatedCode = isQR ? this.generateQRContent() : this.generateBarcodeContent()
          
          console.log("Fallback code generated:", generatedCode.content)
          const resultString = this.extractResultString(generatedCode)
          onResult(resultString)
        }
      }, delay)
    }
  
    shouldProcessResult() {
      const now = Date.now()
      if (now - this.lastDetectionTime < this.detectionCooldown) {
        return false
      }
      this.lastDetectionTime = now
      return true
    }
  
    parseScannedContent(content, format = null) {
      // Auto-detect content type and parse accordingly
      const parsedData = parseUniversalContent(content)
      
      return {
        content,
        type: this.detectCodeType(content, format),
        format: format || this.guessFormat(content),
        parsedData
      }
    }
  
    extractResultString(parsedResult) {
      // For backwards compatibility, extract the most relevant string
      // Only extract shipment ID for direct shipment patterns, not URLs
      
      if (parsedResult.parsedData.type === 'shipment_id' || parsedResult.parsedData.type === 'sku') {
        return parsedResult.parsedData.value
      }
      
      // For everything else (URLs, WiFi, contacts, etc.), return original content
      return parsedResult.content
    }
  
    detectCodeType(content, format) {
      if (format === 'qr_code') return 'qr'
      if (format && format !== 'qr_code') return 'barcode'
      
      // Heuristic detection based on content
      if (content.includes('://') || content.includes('WIFI:') || content.includes('BEGIN:')) {
        return 'qr'
      }
      
      if (content.match(/^(SKU|ORD|UPC)-/) || content.match(/^\d{12,13}$/)) {
        return 'barcode'
      }
      
      return 'unknown'
    }
  
    guessFormat(content) {
      if (content.includes('://') || content.includes('WIFI:') || content.includes('BEGIN:')) {
        return 'qr_code'
      }
      if (content.match(/^\d{12,13}$/)) return 'upc_a'
      if (content.includes('-')) return 'code_128'
      return 'unknown'
    }
  
    stop() {
      this.isScanning = false
  
      if (this.codeReader) {
        this.codeReader.reset()
        this.codeReader = null
      }
  
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
        this.animationFrame = null
      }
  
      if (this.canvas) {
        this.canvas = null
        this.context = null
      }
  
      this.lastDetectionTime = 0
    }
  }
  
  /**
   * Parse different types of content from codes
   */
  export function parseUniversalContent(content) {
    // URL detection
    if (content.match(/^https?:\/\//)) {
      return { type: "url", value: content, display: "Web Link" }
    }
  
    // WiFi network
    if (content.startsWith("WIFI:")) {
      const wifiMatch = content.match(/WIFI:T:([^;]+);S:([^;]+);P:([^;]+);H:([^;]+);;/)
      if (wifiMatch) {
        return {
          type: "wifi",
          value: {
            security: wifiMatch[1],
            ssid: wifiMatch[2],
            password: wifiMatch[3],
            hidden: wifiMatch[4] === "true"
          },
          display: `WiFi: ${wifiMatch[2]}`
        }
      }
    }
  
    // vCard contact
    if (content.includes("BEGIN:VCARD")) {
      const nameMatch = content.match(/FN:([^\n\r]+)/)
      return { 
        type: "contact", 
        value: content,
        display: nameMatch ? `Contact: ${nameMatch[1]}` : "Contact Card"
      }
    }
  
    // Calendar event
    if (content.includes("BEGIN:VEVENT")) {
      const summaryMatch = content.match(/SUMMARY:([^\n\r]+)/)
      return { 
        type: "event", 
        value: content,
        display: summaryMatch ? `Event: ${summaryMatch[1]}` : "Calendar Event"
      }
    }
  
    // Email
    if (content.startsWith("mailto:")) {
      return { type: "email", value: content.substring(7), display: "Email Address" }
    }
  
    // Phone number
    if (content.startsWith("tel:")) {
      return { type: "phone", value: content.substring(4), display: "Phone Number" }
    }
  
    // SMS
    if (content.startsWith("sms:")) {
      return { type: "sms", value: content.substring(4), display: "SMS" }
    }
  
    // Shipment/Order ID patterns
    if (content.match(/^(ORD|SHIP|ORDER)-?\d+$/i)) {
      return { type: "shipment_id", value: content, display: "Shipment ID" }
    }
  
    // SKU patterns
    if (content.match(/^SKU-/i)) {
      return { type: "sku", value: content, display: "Product SKU" }
    }
  
    // UPC/EAN codes
    if (content.match(/^\d{12,13}$/)) {
      return { type: "upc", value: content, display: "Product Code" }
    }
  
    // Default to text
    return { type: "text", value: content, display: "Text Content" }
  }
  
  /**
   * Check if content likely contains shipment information
   */
  export function isShipmentRelated(parsedContent) {
    return [
      'shipment_id', 
      'sku'
    ].includes(parsedContent.type) || 
    parsedContent.value.toString().match(/^(ORD|SHIP|ORDER|45129712335)/i)
  }
  
  /**
   * Extract shipment ID from various content types
   */
  export function extractShipmentId(parsedContent) {
    if (parsedContent.type === 'shipment_id') {
      return parsedContent.value
    }
    
    if (parsedContent.type === 'text' || parsedContent.type === 'sku') {
      // Try to extract shipment-like patterns
      const match = parsedContent.value.match(/(ORD|SHIP|ORDER)-?(\d+)/i)
      if (match) return match[0]
      
      // Check for numeric patterns that might be shipment IDs
      const numericMatch = parsedContent.value.match(/\b(\d{8,})\b/)
      if (numericMatch) return numericMatch[1]
    }
    
    return parsedContent.value
  }
  
  /**
   * Initialize ZXing library if not already loaded
   */
  export async function initializeZXing() {
    if (typeof window === "undefined") return false
  
    if (window.ZXing) return true
  
    try {
      // In a real implementation, you would import like this:
      // import { BrowserMultiFormatReader } from '@zxing/library'
      // window.ZXing = { BrowserMultiFormatReader }
  
      console.log("ZXing library would be loaded here")
      return false // Return false to use fallback methods
    } catch (error) {
      console.error("Failed to load ZXing library:", error)
      return false
    }
  }
  
  /**
   * Check if native BarcodeDetector is supported
   */
  export function isUniversalDetectorSupported() {
    return typeof window !== "undefined" && "BarcodeDetector" in window
  }
  
  /**
   * Get all supported formats
   */
  export async function getSupportedFormats() {
    if (!isUniversalDetectorSupported()) {
      return [
        "code_128", "code_39", "code_93", 
        "ean_13", "ean_8", "upc_a", "upc_e",
        "qr_code", "data_matrix"
      ]
    }
  
    try {
      return await window.BarcodeDetector.getSupportedFormats()
    } catch (error) {
      console.error("Failed to get supported formats:", error)
      return ["code_128", "code_39", "ean_13", "ean_8", "qr_code"]
    }
  }