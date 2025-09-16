"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import MercadoLibreTab from "./tabs/mercadolibre-tab"
import OrganizationTab from "./tabs/organization-tab"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'mercadolibre' | 'organization'>('mercadolibre')

  return (
    <LayoutWrapper>
      <main className="min-h-[calc(100vh-5rem)]">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('mercadolibre')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'mercadolibre'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                MercadoLibre Connections
              </button>
              <button
                onClick={() => setActiveTab('organization')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'organization'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Organization Users
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'mercadolibre' ? (
            <MercadoLibreTab />
          ) : (
            <OrganizationTab />
          )}
        </div>
      </main>
    </LayoutWrapper>
  )
}