"use client"

import type React from "react"
import { useState, useEffect } from 'react';
import { User, ChevronDown } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getMeliAccounts, updateMeliCurrent, getCurrentUser } from '@/lib/meli_tokens_client';
import { supabase } from '@/lib/supabase/client'; // Use shared client

export function AccountSelector() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initializeAuth() {
      try {
        // console.log('[AccountSelector] Checking auth session...');
        
        // Add small delay to ensure cookies are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Wait for Supabase to determine auth state
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AccountSelector] Auth error:', error);
          setError(error);
          return;
        }

        // console.log('[AccountSelector] Session data:', session);
        setUser(session?.user ?? null);
        // console.log('[AccountSelector] Auth session:', session?.user ? 'authenticated' : 'not authenticated');

        // If user is authenticated, fetch account data
        if (session?.user) {
          setDataLoading(true);
          try {
            // console.log('[AccountSelector] Loading accounts and user info...');
            
            // Validate session is still valid by testing a simple call first
            const userData = await getCurrentUser();
            
            if (!userData) {
              throw new Error('Session is invalid - user data is null');
            }
            
            // If user data is valid, proceed with accounts
            const accountData = await getMeliAccounts();
            
            setAccounts(accountData || []);
            setUserInfo(userData);

            if (accountData && accountData.length > 0 && !currentAccount) {
              setCurrentAccount(accountData[0]);
            }
            
            setError(null);
            // console.log('[AccountSelector] Loaded accounts:', accountData);
            // console.log('[AccountSelector] Loaded user info:', userData);
          } catch (error) {
            console.error('[AccountSelector] Failed to load data:', error);
            
            // If it's an auth error, clear the user state
            if (error.message?.includes('Auth session missing') || error.message?.includes('Session is invalid')) {
              // console.log('[AccountSelector] Auth session invalid, clearing user state');
              setUser(null);
            }
            
            setError(error);
          } finally {
            setDataLoading(false);
          }
        }
      } catch (error) {
        console.error('[AccountSelector] Initialization error:', error);
        setError(error);
      } finally {
        setAuthLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const handleAccountSelect = async (account) => {
    try {
      // console.log('[AccountSelector] Selecting account:', account);
      await updateMeliCurrent(account.meli_user_id);
      setCurrentAccount(account);
      setError(null);
      // console.log('[AccountSelector] Account updated successfully');
    } catch (error) {
      setError(error);
      console.error('[AccountSelector] Failed to update account:', error);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="bg-white/90 shadow-lg border-gray-200 rounded p-2 flex items-center gap-2">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">Checking auth...</span>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="bg-white/90 shadow-lg border-gray-200 rounded p-2 flex items-center gap-2">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">Please log in</span>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs text-blue-500 hover:text-blue-700 ml-2"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2 flex items-center gap-2">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">
          {dataLoading ? 'Loading...' : currentAccount?.nickname || 'Select Account'}
        </span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded mb-2">
            <strong>Error:</strong> {
              error.message?.includes('Auth session missing') || error.message?.includes('Session is invalid')
                ? 'Authentication expired. Please log in again.'
                : error.message || String(error)
            }
            {(error.message?.includes('Auth session missing') || error.message?.includes('Session is invalid')) && (
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-sm underline"
              >
                Refresh
              </button>
            )}
          </div>
        )}

        {/* User Info Section */}
        {userInfo && (
          <>
            <div className="p-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userInfo.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {userInfo.user_metadata?.full_name || userInfo.email?.split('@')[0]}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{userInfo.email}</p>
                  <p className="text-xs text-gray-400">
                    ID: {userInfo.id?.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel>MercadoLibre Accounts</DropdownMenuLabel>
        <div className="p-2 space-y-2">
          {dataLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading accounts...</p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50
                  ${currentAccount?.id === account.id 
                    ? 'border-2 border-blue-500 bg-blue-50' 
                    : 'border border-gray-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Account Image */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {account.thumbnail_url ? (
                      <img 
                        src={account.thumbnail_url} 
                        alt={account.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {account.nickname?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {account.nickname}
                      </p>
                      {account.permalink && (
                        <Link
                          href={account.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Profile
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{account.site_id}</span>
                      {account.country_id && <span>• {account.country_id}</span>}
                      {account.user_type && <span>• {account.user_type}</span>}
                    </div>
                    {account.seller_level_id && (
                      <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded-full">
                        {account.seller_level_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}