// app/api/auth/initiate/route.js

export async function GET(request) {
    try {
      // Get client ID from environment variables
      const clientId = process.env.CLIENT_ID;
      
      if (!clientId) {
        console.error('CLIENT_ID environment variable is not set');
        return Response.redirect('/?error=missing_config');
      }
  
      // Build MercadoLibre OAuth authorization URL
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://laburandik.vercel.app/api/auth/callback'
      });
  
      const authUrl = `https://auth.mercadolibre.com.ar/authorization?${authParams.toString()}`;
  
      console.log('Redirecting to MercadoLibre OAuth:', authUrl);
  
      // Redirect user to MercadoLibre authorization page
      return Response.redirect(authUrl);
  
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      
      // Redirect back to main app with error
      return Response.redirect('/?error=oauth_init_failed');
    }
  }