"use client"

import type React from "react"
import { useState, useEffect } from 'react';
import { User, X } from "lucide-react"
import Link from "next/link"
import { getMeliAccounts, updateMeliCurrent, getCurrentUser } from '@/lib/meli_tokens_client';

interface MobileAccountSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAccountSidebar({ isOpen, onClose }: MobileAccountSidebarProps) {
  const [accounts, setAccounts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountData, userData] = await Promise.all([
          getMeliAccounts(),
          getCurrentUser()
        ]);
        
        setAccounts(accountData);
        setUserInfo(userData);
        
        if (accountData.length > 0 && !currentAccount) {
          setCurrentAccount(accountData[0]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAccountSelect = async (account) => {
    try {
      await updateMeliCurrent(account.meli_user_id);
      setCurrentAccount(account);
      onClose(); // Close sidebar after selection
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 md:hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Account</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close account menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full pb-16">
          {/* User Info Section */}
          {userInfo && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
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
          )}

          {/* Accounts Section */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">MercadoLibre Accounts</h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading accounts...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}