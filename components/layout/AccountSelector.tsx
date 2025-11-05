"use client"

import type React from "react"
import { useState, useEffect } from 'react';
import { ChevronsUpDown, User as UserIcon } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { getMeliAccounts, updateMeliCurrent, getCurrentUser, getCurrentMeliUserId } from '@/lib/meli_tokens_client';
import { supabase } from '@/lib/supabase/client';

interface MeliAccount {
  id: string;
  meli_user_id: string;
  nickname: string;
  thumbnail_url?: string;
  site_id: string;
  country_id?: string;
  user_type?: string;
  seller_level_id?: string;
  permalink?: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export function AccountSelector() {
  const { isMobile } = useSidebar()
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accounts, setAccounts] = useState<MeliAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<MeliAccount | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Add small delay to ensure cookies are loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Wait for Supabase to determine auth state
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AccountSelector] Auth error:', error);
          setError(error);
          return;
        }

        setUser(session?.user ?? null);

        // If user is authenticated, fetch account data
        if (session?.user) {
          setDataLoading(true);
          try {
            // Validate session is still valid by testing a simple call first
            const userData = await getCurrentUser();

            if (!userData) {
              throw new Error('Session is invalid - user data is null');
            }

            // If user data is valid, proceed with accounts
            const accountData = await getMeliAccounts();
            setAccounts(accountData || []);
            setUserInfo(userData);

            // Get the preferred current account from database
            if (accountData && accountData.length > 0) {
              try {
                const preferredAccountId = await getCurrentMeliUserId();

                if (preferredAccountId) {
                  // Find the preferred account in the loaded accounts
                  const preferredAccount = accountData.find(
                    account => account.meli_user_id === preferredAccountId
                  );

                  if (preferredAccount) {
                    setCurrentAccount(preferredAccount);
                  } else {
                    // Preferred account not found, use first account
                    setCurrentAccount(accountData[0]);
                  }
                } else {
                  // No preference set, use first account
                  setCurrentAccount(accountData[0]);
                }
              } catch (prefError) {
                console.error('[AccountSelector] Error getting preferred account:', prefError);
                // Fallback to first account
                setCurrentAccount(accountData[0]);
              }
            }

            setError(null);
          } catch (error) {
            console.error('[AccountSelector] Failed to load data:', error);

            // If it's an auth error, clear the user state
            if (error instanceof Error && (error.message?.includes('Auth session missing') || error.message?.includes('Session is invalid'))) {
              setUser(null);
            }

            setError(error instanceof Error ? error : new Error(String(error)));
          } finally {
            setDataLoading(false);
          }
        }
      } catch (error) {
        console.error('[AccountSelector] Initialization error:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setAuthLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const handleAccountSelect = async (account: MeliAccount) => {
    try {
      await updateMeliCurrent(account.meli_user_id);
      setCurrentAccount(account);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      console.error('[AccountSelector] Failed to update account:', error);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <UserIcon className="h-4 w-4" />
            <span>Checking auth...</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => window.location.reload()}
          >
            <UserIcon className="h-4 w-4" />
            <span>Please log in</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {currentAccount?.thumbnail_url ? (
                  <AvatarImage src={currentAccount.thumbnail_url} alt={currentAccount?.nickname} />
                ) : (
                  <AvatarFallback className="rounded-lg bg-gradient-to-r from-green-400 to-blue-500">
                    {currentAccount?.nickname?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {dataLoading ? 'Loading...' : currentAccount?.nickname || 'Select Account'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {userInfo?.email || 'No email'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-80 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg m-2">
                <strong>Error:</strong>{' '}
                {error.message?.includes('Auth session missing') || error.message?.includes('Session is invalid')
                  ? 'Authentication expired. Please log in again.'
                  : error.message || String(error)}
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
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    {/* <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
                        {userInfo.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar> */}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userInfo.user_metadata?.full_name || userInfo.email?.split('@')[0]}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userInfo.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel>MercadoLibre Accounts</DropdownMenuLabel>
            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
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
                      p-2 rounded-lg cursor-pointer transition-all hover:bg-accent
                      ${currentAccount?.meli_user_id === account.meli_user_id
                        ? 'bg-accent border-2 border-primary'
                        : 'border border-border'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {account.thumbnail_url ? (
                          <AvatarImage src={account.thumbnail_url} alt={account.nickname} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-500">
                            {account.nickname?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {account.nickname}
                          </p>
                          {account.permalink && (
                            <Link
                              href={account.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Profile
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{account.site_id}</span>
                          {account.country_id && <span>• {account.country_id}</span>}
                          {account.user_type && <span>• {account.user_type}</span>}
                        </div>
                        {account.seller_level_id && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-secondary text-xs rounded-full">
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
