"use client"

import { useState, useEffect } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function SettingsPage() {
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
    }, 1000)
  }

  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* <div className="space-y-2">
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
            </div> */}

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
      </main>
    </LayoutWrapper>
  )
}
