import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mercado Libre Scanner",
  description: "Barcode scanner for Mercado Libre products and orders",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* ZXing-js library - In production, install via npm instead */}
        <script src="https://unpkg.com/@zxing/library@latest/umd/index.min.js" async />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
