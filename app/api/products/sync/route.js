// // app/api/products/sync/route.js
// import { NextResponse } from 'next/server'
// import { syncAllProducts } from '@/lib/product-sync'

// export async function GET(request) {
//   try {
//     const authHeader = request.headers.get('authorization')
//     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
    
//     console.log('Starting product sync...')
//     const result = await syncAllProducts()
//     console.log('Product sync completed:', result)
    
//     return NextResponse.json(result)
    
//   } catch (error) {
//     console.error('Product sync failed:', error)
//     return NextResponse.json(
//       { error: 'Sync failed', details: error.message },
//       { status: 500 }
//     )
//   }
// }

// export async function POST(request) {
//   try {
//     console.log('Manual product sync triggered...')
//     const result = await syncAllProducts()
//     console.log('Manual sync completed:', result)
    
//     return NextResponse.json(result)
    
//   } catch (error) {
//     console.error('Manual sync failed:', error)
//     return NextResponse.json(
//       { error: 'Manual sync failed', details: error.message },
//       { status: 500 }
//     )
//   }
// }