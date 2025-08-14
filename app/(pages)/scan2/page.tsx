"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Scan2Page() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new scan page
    router.replace('/scan2/scan')
  }, [router])

  return null
}

