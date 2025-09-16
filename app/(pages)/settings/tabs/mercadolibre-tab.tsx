"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getMeliAccounts, getCurrentMeliUserId } from '@/lib/meli_tokens_client'

interface MeliAccount {
  id: string | number
  nickname: string
  permalink?: string
  thumbnail_url?: string
  first_name?: string
  last_name?: string
  country_id?: string
  site_id?: string
  user_type?: string
  seller_level_id?: string | null
  power_seller_status?: string | null
}

export default function MercadoLibreTab() {
  const [accounts, setAccounts] = useState<MeliAccount[]>([])
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshingAccount, setRefreshingAccount] = useState<string | null>(null)
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [accountToDisconnect, setAccountToDisconnect] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const allAccounts = await getMeliAccounts()
      const currentId = await getCurrentMeliUserId()

      const formattedAccounts = allAccounts.map((account: any) => ({
        id: account.meli_user_id,
        nickname: account.nickname,
        permalink: account.permalink,
        thumbnail_url: account.thumbnail_url,
        first_name: account.first_name,
        last_name: account.last_name,
        country_id: account.country_id,
        site_id: account.site_id,
        user_type: account.user_type,
        seller_level_id: account.seller_level_id,
        power_seller_status: account.power_seller_status
      }))

      setAccounts(formattedAccounts)
      setCurrentAccountId(currentId)
    } catch (error) {
      console.error('Error loading accounts:', error)
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const refreshAccount = async (accountId: string) => {
    setRefreshingAccount(accountId)
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh account')
      }

      await loadAccounts()
    } catch (error) {
      console.error('Error refreshing account:', error)
      setError('Failed to refresh account')
    } finally {
      setRefreshingAccount(null)
    }
  }

  const confirmDisconnect = (accountId: string) => {
    setAccountToDisconnect(accountId)
    setShowDisconnectDialog(true)
  }

  const handleDisconnect = async () => {
    if (!accountToDisconnect) return

    setDisconnectingAccount(accountToDisconnect)
    setShowDisconnectDialog(false)

    try {
      const response = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: accountToDisconnect })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect account')
      }

      await loadAccounts()
    } catch (error) {
      console.error('Error disconnecting account:', error)
      setError('Failed to disconnect account')
    } finally {
      setDisconnectingAccount(null)
      setAccountToDisconnect(null)
    }
  }

  const connectNewAccount = () => {
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/api/auth/initiate?returnUrl=${returnUrl}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">MercadoLibre Connections</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">MercadoLibre Connections</h2>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No MercadoLibre accounts connected</p>
          <Button
            onClick={connectNewAccount}
            className="bg-black hover:bg-gray-800 text-white"
          >
            Connect MercadoLibre Account
          </Button>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {accounts.map((account, index) => (
              <div key={account.id}>
                <div className="flex items-center gap-4 p-4">
                  {account.thumbnail_url ? (
                    <img
                      src={account.thumbnail_url}
                      alt={account.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                      {account.nickname?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.nickname}</span>
                      {currentAccountId === String(account.id) && (
                        <span className="text-xs bg-black text-white px-2 py-0.5 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      ID: {account.id}
                      {account.seller_level_id && (
                        <span> • Level: {account.seller_level_id}</span>
                      )}
                      {account.power_seller_status && (
                        <span> • {account.power_seller_status}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refreshAccount(String(account.id))}
                      disabled={refreshingAccount === String(account.id)}
                      className="border-black text-black hover:bg-gray-100"
                    >
                      {refreshingAccount === String(account.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => confirmDisconnect(String(account.id))}
                      disabled={disconnectingAccount === String(account.id)}
                      className="border-black text-black hover:bg-gray-100"
                    >
                      {disconnectingAccount === String(account.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </div>
                </div>
                {index < accounts.length - 1 && <div className="border-t border-gray-200" />}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button
              onClick={connectNewAccount}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              Connect Another Account
            </Button>
          </div>
        </>
      )}

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Disconnection</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this MercadoLibre account?
              This will remove access to all related features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisconnect}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}