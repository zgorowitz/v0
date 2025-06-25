import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
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
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-800">Mercado Libre Scanner</CardTitle>
            <CardDescription className="text-gray-600">
              Scan barcodes to retrieve product and order information
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/scan" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                Start Scanning
              </Button>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/orders" className="w-full">
                <Button
                  variant="outline"
                  className="w-full bg-white/90 text-gray-800 border-gray-300 hover:bg-white"
                  size="sm"
                >
                  Today's Orders
                </Button>
              </Link>
              <Link href="/skus" className="w-full">
                <Button
                  variant="outline"
                  className="w-full bg-white/90 text-gray-800 border-gray-300 hover:bg-white"
                  size="sm"
                >
                  All SKUs
                </Button>
              </Link>
            </div>

            <Link href="/settings" className="w-full">
              <Button
                variant="secondary"
                className="w-full bg-gray-100/90 hover:bg-gray-200/90 text-gray-800"
                size="lg"
              >
                Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
