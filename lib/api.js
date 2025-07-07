// import dotenv from 'dotenv';
// dotenv.config();
// MercadoLibre API Functions for Next.js
const accessToken = process.env.ACCESS_TOKEN;

/**
 * Get initial access token and refresh token using authorization code
 * @param {string} authCode - SERVER_GENERATED_AUTHORIZATION_CODE
 * @returns {Promise<{refresh_token: string, access_token: string, expires_in: number}>}
 */
export async function getNewAccessToken(authCode) {
  const clientId = process.env.MERCADO_LIBRE_APP_ID
  const clientSecret = process.env.MERCADO_LIBRE_CLIENT_SECRET
  const redirectUri = process.env.MERCADO_LIBRE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing required environment variables")
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: authCode,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorData}`)
  }

  const data = await response.json()

  return {
    refresh_token: data.refresh_token,
    access_token: data.access_token,
    expires_in: data.expires_in,
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Your refresh token
 * @returns {Promise<{access_token: string, expires_in: number}>}
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.MERCADO_LIBRE_APP_ID
  const clientSecret = process.env.MERCADO_LIBRE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing required environment variables")
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorData}`)
  }

  const data = await response.json()

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  }
}

/**
 * Get user information using access token
 * @param {string} accessToken - Your access token
 * @returns {Promise<Object>} - User information object
 */
async function getUserInfo(accessToken) {
  const response = await fetch("https://api.mercadolibre.com/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorData}`)
  }

  return await response.json()
}

/**
 * Main function that handles token management and makes API calls
 * Checks refresh token existence and access token expiry from environment
 * @returns {Promise<Object>} - User information
 */
export async function getAuthenticatedUserInfo() {
  const refreshToken = process.env.MERCADO_LIBRE_REFRESH_TOKEN
  const accessToken = process.env.MERCADO_LIBRE_ACCESS_TOKEN
  const expiresIn = process.env.MERCADO_LIBRE_EXPIRES_IN
  const tokenTimestamp = process.env.MERCADO_LIBRE_TOKEN_TIMESTAMP

  // Check if refresh token exists
  if (!refreshToken) {
    throw new Error("No refresh token found. Please run initial authorization flow.")
  }

  // Check if access token exists and is still valid
  if (accessToken && expiresIn && tokenTimestamp) {
    const tokenAge = (Date.now() - Number.parseInt(tokenTimestamp)) / 1000 // seconds
    const expiresInSeconds = Number.parseInt(expiresIn)

    // If token is still valid (with 5 minute buffer), use it
    if (tokenAge < expiresInSeconds - 300) {
      try {
        return await getUserInfo(accessToken)
      } catch (error) {
        console.log("Access token invalid, refreshing...")
      }
    }
  }

  // Access token expired or invalid, refresh it
  try {
    const newTokens = await refreshAccessToken(refreshToken)

    // In a real app, you would save these new tokens to your environment/database
    console.log("New access token obtained:", {
      access_token: newTokens.access_token,
      expires_in: newTokens.expires_in,
      timestamp: Date.now(),
    })

    return await getUserInfo(newTokens.access_token)
  } catch (error) {
    throw new Error(`Failed to refresh token: ${error.message}`)
  }
}

// lib/api.js
// lib/api.js
export async function extractShipmentInfo(shipmentId) {
  try {
    const response = await fetch(`/api/shipment/${shipmentId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Client API Error:', error);
    throw error;
  }
}
/**
 * fetch shipping info ------------------------------------------------------------
 */
