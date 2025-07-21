"use client"

import type React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { MobileLayout } from "@/components/layout/MobileLayout"
import { DesktopLayout } from "@/components/layout/DesktopLayout"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isMobile, isLoaded } = useIsMobile();

  // Prevent hydration mismatch by showing loading state until client-side detection is complete
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render appropriate layout based on screen size
  return isMobile ? (
    <MobileLayout>{children}</MobileLayout>
  ) : (
    <DesktopLayout>{children}</DesktopLayout>
  );
}

//--------------------------------------

// "use client"

// import type React from "react"
// import { useState, useEffect } from 'react';
// import { Menu, ArrowLeft, Home, User, ChevronDown } from "lucide-react"
// import Link from "next/link"
// import { useRouter } from "next/navigation" 

// import { AppSidebar } from "@/components/app-sidebar"
// import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import { getMeliAccounts, updateMeliCurrent, getCurrentUser } from '@/lib/meli_tokens_client';

// interface LayoutWrapperProps {
//   children: React.ReactNode
// }

// export function LayoutWrapper({ children }: LayoutWrapperProps) {
//   const router = useRouter();
//   const [accounts, setAccounts] = useState([]);
//   const [currentAccount, setCurrentAccount] = useState(null);
//   const [userInfo, setUserInfo] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function loadData() {
//       try {
//         // Load accounts and user info
//         const [accountData, userData] = await Promise.all([
//           getMeliAccounts(),
//           getCurrentUser()
//         ]);
        
//         setAccounts(accountData);
//         setUserInfo(userData);
        
//         // Set first account as default if none selected
//         if (accountData.length > 0 && !currentAccount) {
//           setCurrentAccount(accountData[0]);
//         }
//       } catch (error) {
//         console.error('Failed to load data:', error);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadData();
//   }, []);

//   const handleAccountSelect = async (account) => {
//     try {
//       await updateMeliCurrent(account.meli_user_id);
//       setCurrentAccount(account);
//     } catch (error) {
//       console.error('Failed to update account:', error);
//     }
//   };

//   return (
//     <SidebarProvider defaultOpen={false}>
//       <AppSidebar />
//       <SidebarInset>
//         <div className="relative min-h-screen">
//           {/* Top bar */}
//           <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4">
//             {/* Menu, Back, and Home (left) */}
//             <div className="flex items-center gap-2">
//               <SidebarTrigger className="bg-white/90 hover:bg-white shadow-lg border-gray-200">
//                 <Menu className="h-4 w-4" />
//                 <span className="sr-only">Toggle menu</span>
//               </SidebarTrigger>
//               <button
//                 onClick={() => router.back()}
//                 className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//                 aria-label="Go back"
//               >
//                 <ArrowLeft className="h-4 w-4" />
//               </button>
//               <Link
//                 href="/"
//                 className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//                 aria-label="Go home"
//               >
//                 <Home className="h-4 w-4" />
//               </Link>
//             </div>

//             {/* Account Menu (right) */}
//             <DropdownMenu>
//               <DropdownMenuTrigger className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2 flex items-center gap-2">
//                 <User className="h-4 w-4" />
//                 <span className="text-sm font-medium">
//                   {loading ? 'Loading...' : currentAccount?.nickname || 'Select Account'}
//                 </span>
//                 <ChevronDown className="h-3 w-3" />
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="end" className="w-80">
//                 {/* User Info Section */}
//                 {userInfo && (
//                   <>
//                     <div className="p-3 border-b">
//                       <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
//                           {userInfo.email?.charAt(0).toUpperCase()}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className="font-medium text-gray-900 truncate">
//                             {userInfo.user_metadata?.full_name || userInfo.email?.split('@')[0]}
//                           </p>
//                           <p className="text-sm text-gray-500 truncate">{userInfo.email}</p>
//                           <p className="text-xs text-gray-400">
//                             ID: {userInfo.id?.slice(0, 8)}...
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                     <DropdownMenuSeparator />
//                   </>
//                 )}

//                 <DropdownMenuLabel>MercadoLibre Accounts</DropdownMenuLabel>
//                 <div className="p-2 space-y-2">
//                   {accounts.map((account) => (
//                     <div
//                       key={account.id}
//                       onClick={() => handleAccountSelect(account)}
//                       className={`
//                         p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50
//                         ${currentAccount?.id === account.id 
//                           ? 'border-2 border-blue-500 bg-blue-50' 
//                           : 'border border-gray-200'
//                         }
//                       `}
//                     >
//                       <div className="flex items-center gap-3">
//                         {/* Account Image */}
//                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
//                           {account.thumbnail_url ? (
//                             <img 
//                               src={account.thumbnail_url} 
//                               alt={account.nickname}
//                               className="w-full h-full object-cover"
//                             />
//                           ) : (
//                             <div className="w-full h-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
//                               {account.nickname?.charAt(0).toUpperCase()}
//                             </div>
//                           )}
//                         </div>
                        
//                         {/* Account Info */}
//                         <div className="flex-1 min-w-0">
//                           <div className="flex items-center gap-2">
//                             <p className="font-medium text-gray-900 truncate">
//                               {account.nickname}
//                             </p>
//                             {account.permalink && (
//                               <Link
//                                 href={account.permalink}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="text-blue-500 hover:text-blue-700 text-xs"
//                                 onClick={(e) => e.stopPropagation()}
//                               >
//                                 Profile
//                               </Link>
//                             )}
//                           </div>
//                           <div className="flex items-center gap-2 text-xs text-gray-500">
//                             <span>{account.site_id}</span>
//                             {account.country_id && <span>• {account.country_id}</span>}
//                             {account.user_type && <span>• {account.user_type}</span>}
//                           </div>
//                           {account.seller_level_id && (
//                             <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded-full">
//                               {account.seller_level_id}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </div>
//           {/* Main content */}
//           <div className="pt-20">{children}</div>
//         </div>
//       </SidebarInset>
//     </SidebarProvider>
//   )
// }

//---------------------------------------------------

// "use client"

// import type React from "react"
// // import { Menu } from "lucide-react"
// import { Menu, ArrowLeft, Home } from "lucide-react"   // Add after your existing lucide-react import
// import Link from "next/link"                           // Add after your existing imports
// import { useRouter } from "next/navigation" 

// import { AppSidebar } from "@/components/app-sidebar"
// import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

// interface LayoutWrapperProps {
//   children: React.ReactNode
// }

// export function LayoutWrapper({ children }: LayoutWrapperProps) {
//   const router = useRouter();
//   return (
//     <SidebarProvider defaultOpen={false}>
//       <AppSidebar />
//       <SidebarInset>
//         <div className="relative min-h-screen">
//           {/* Top bar */}
//           <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4">
//             {/* Menu and Back (left) */}
//             <div className="flex items-center gap-2">
//               <SidebarTrigger className="bg-white/90 hover:bg-white shadow-lg border-gray-200">
//                 <Menu className="h-4 w-4" />
//                 <span className="sr-only">Toggle menu</span>
//               </SidebarTrigger>
//               <button
//                 onClick={() => router.back()}
//                 className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//                 aria-label="Go back"
//               >
//                 <ArrowLeft className="h-4 w-4" />
//               </button>
//             </div>

//             {/* Logo as Home button (right) */}
//             <Link
//               href="/"
//               className="flex items-center gap-2 bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//               aria-label="Go home"
//             >
//               <span className="text-2xl font-bold text-gray-800 drop-shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//                 Laburandik
//               </span>
//             </Link>
//           </div>
//           {/* Main content */}
//           <div className="pt-20">{children}</div>
//         </div>
//       </SidebarInset>
//     </SidebarProvider>
//   )
// }
