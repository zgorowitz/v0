// app/api/auth/initiate/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    // Get client ID from environment variables
    const clientId = process.env.MERCADO_LIBRE_APP_ID;
    
    // Determine the correct base URL based on environment
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host?.includes('localhost') 
      ? `http://${host}` 
      : `${protocol}://${host}`;
    
    if (!clientId) {
      console.error('MERCADO_LIBRE_APP_ID environment variable is not set');
      return NextResponse.redirect(`${baseUrl}/settings?error=missing_config`);
    }

    // Get current user (more secure than getSession)
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return NextResponse.redirect(`${baseUrl}/settings?error=not_authenticated`);
    }

    // Get return URL from query params
    const returnUrl = request.nextUrl?.searchParams.get('returnUrl') || `${baseUrl}/settings`;
    
    // Create simplified state parameter (just user ID and return URL)
    const stateData = {
      userId: user.id,
      returnUrl: returnUrl,
      timestamp: Date.now()
    };
    
    const state = btoa(JSON.stringify(stateData));

    // Build MercadoLibre OAuth authorization URL
    const redirectUri = `${baseUrl}/api/auth/callback`;
    
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state
    });

    const authUrl = `https://auth.mercadolibre.com.ar/authorization?${authParams.toString()}`;

    console.log('Redirecting to MercadoLibre OAuth:', authUrl);
    console.log('Base URL:', baseUrl);
    console.log('Redirect URI:', redirectUri);

    // Use NextResponse.redirect with proper status code
    return NextResponse.redirect(authUrl, { status: 307 });

  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    
    // Try to determine baseUrl for error redirect
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host?.includes('localhost') 
      ? `http://${host}` 
      : `${protocol}://${host}`;
      
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