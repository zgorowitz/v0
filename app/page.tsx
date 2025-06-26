import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function Home() {
  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
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
          </CardContent>
        </Card>
      </main>
    </LayoutWrapper>
  )
}
