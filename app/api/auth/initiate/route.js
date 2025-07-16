// app/api/auth/initiate/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get client ID from environment variables
    const clientId = process.env.MERCADO_LIBRE_APP_ID;
    const baseUrl = 'https://laburandik.vercel.app/api/auth/callback';
    
    if (!clientId) {
      console.error('MERCADO_LIBRE_APP_ID environment variable is not set');
      return NextResponse.redirect(`${baseUrl}/settings?error=missing_config`);
    }

    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BASE_URL environment variable is not set');
      return NextResponse.json({ error: 'Base URL not configured' }, { status: 500 });
    }

    // Build MercadoLibre OAuth authorization URL
    const redirectUri = `${baseUrl}/api/auth/callback`;
    
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri
    });

    const authUrl = `https://auth.mercadolibre.com.ar/authorization?${authParams.toString()}`;

    console.log('Redirecting to MercadoLibre OAuth:', authUrl);

    // Use NextResponse.redirect with proper status code
    return NextResponse.redirect(authUrl, { status: 307 });

  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?error=oauth_init_failed`);
  }
}

// app/api/auth/initiate/route.js

// export async function GET(request) {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
//     const redirectUri = `${baseUrl}/api/auth/callback`;
//     try {
//       // Get client ID from environment variables
//       const clientId = process.env.MERCADO_LIBRE_APP_ID;
      
//       if (!clientId) {
//         console.error('CLIENT_ID environment variable is not set');
//         return Response.redirect('/settings?error=missing_config');
//       }
  
//       // Build MercadoLibre OAuth authorization URL
//       const authParams = new URLSearchParams({
//         response_type: 'code',
//         client_id: clientId,
//         redirect_uri: redirectUri
//       });
  
//       const authUrl = `https://auth.mercadolibre.com.ar/authorization?${authParams.toString()}`;
  
//       console.log('Redirecting to MercadoLibre OAuth:', authUrl);
  
//       // Redirect user to MercadoLibre authorization page
//       return Response.redirect(authUrl);
  
//     } catch (error) {
//       console.error('Error initiating OAuth flow:', error);
      
//       // Redirect back to main app with error
//       return Response.redirect('settings/?error=oauth_init_failed');
//     }
//   }