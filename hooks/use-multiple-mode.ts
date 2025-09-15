import { useState, useCallback, useEffect } from 'react'

interface UseMultipleModeReturn {
  multipleMode: boolean
  toggleMultipleMode: () => void
  enableMultipleMode: () => void
  disableMultipleMode: () => void
  setMultipleMode: (enabled: boolean) => void
}

interface UseMultipleModeOptions {
  onModeChange?: (enabled: boolean) => void
  clearScannedCodes?: () => void
  enableVibration?: boolean
  enableLogging?: boolean
}

export function useMultipleMode(options: UseMultipleModeOptions = {}): UseMultipleModeReturn {
  const {
    onModeChange,
    clearScannedCodes,
    enableVibration = true,
    enableLogging = true
  } = options

  const [multipleMode, setMultipleModeState] = useState(false)

  // Debug multipleMode changes
  useEffect(() => {
    if (enableLogging) {
      console.log('🔄 multipleMode changed:', multipleMode)
    }
    onModeChange?.(multipleMode)
  }, [multipleMode, onModeChange, enableLogging])

  const setMultipleMode = useCallback((enabled: boolean) => {
    if (enableLogging) {
      console.log(enabled ? '🟢 Enabling multiple mode' : '🔴 Disabling multiple mode')
    }
    setMultipleModeState(enabled)
    clearScannedCodes?.()
  }, [clearScannedCodes, enableLogging])

  const toggleMultipleMode = useCallback(() => {
    if (enableLogging) {
      console.log('🔘 Multiple button clicked | current multipleMode:', multipleMode)
    }
    setMultipleMode(!multipleMode)
  }, [multipleMode, setMultipleMode, enableLogging])

  const enableMultipleMode = useCallback(() => {
    setMultipleMode(true)
  }, [setMultipleMode])

  const disableMultipleMode = useCallback(() => {
    setMultipleMode(false)
  }, [setMultipleMode])

  return {
    multipleMode,
    toggleMultipleMode,
    enableMultipleMode,
    disableMultipleMode,
    setMultipleMode
  }
}