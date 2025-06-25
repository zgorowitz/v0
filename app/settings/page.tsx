"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    apiKey: "",
    apiSecret: "",
    useHardwareScanner: true,
    vibrationFeedback: true,
    soundFeedback: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("scannerSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSaveSettings = () => {
    setIsSaving(true)

    // Save settings to localStorage
    localStorage.setItem("scannerSettings", JSON.stringify(settings))

    // Simulate API call to save settings
    setTimeout(() => {
      setIsSaving(false)
      router.push("/")
    }, 1000)
  }

  return (
    <main className="relative flex min-h-screen flex-col p-4">
      {/* Background Image Container - 50% of screen with white border */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-1/2 h-1/2 bg-cover bg-center bg-no-repeat border-4 border-white rounded-lg shadow-2xl"
          style={{
            backgroundImage: "url('/images/background.png')",
          }}
        />
      </div>

      {/* Gradient overlays for blending */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-transparent to-gray-100" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-100 via-transparent to-gray-100" />

      {/* Light overlay for better text readability */}
      <div className="absolute inset-0 bg-black/5" />

      {/* Content */}
      <div className="relative z-10">
        <Button
          variant="ghost"
          className="w-fit mb-4 bg-white/30 hover:bg-white/40 text-gray-800 backdrop-blur-sm border border-white/20"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Mercado Libre API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={settings.apiSecret}
                onChange={(e) => setSettings({ ...settings, apiSecret: e.target.value })}
                placeholder="Enter your API secret"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hardwareScanner">Use Hardware Scanner</Label>
              <Switch
                id="hardwareScanner"
                checked={settings.useHardwareScanner}
                onCheckedChange={(checked) => setSettings({ ...settings, useHardwareScanner: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="vibration">Vibration Feedback</Label>
              <Switch
                id="vibration"
                checked={settings.vibrationFeedback}
                onCheckedChange={(checked) => setSettings({ ...settings, vibrationFeedback: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound">Sound Feedback</Label>
              <Switch
                id="sound"
                checked={settings.soundFeedback}
                onCheckedChange={(checked) => setSettings({ ...settings, soundFeedback: checked })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
