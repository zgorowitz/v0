/**
 * Mercado Libre API Configuration
 */
const ML_CONFIG = {
  appId: process.env.MERCADO_LIBRE_APP_ID,
  clientSecret: process.env.MERCADO_LIBRE_CLIENT_SECRET,
  redirectUri: process.env.MERCADO_LIBRE_REDIRECT_URI || "http://localhost:3000/auth/callback",
  siteId: process.env.MERCADO_LIBRE_SITE_ID || "MLM", // Default to Mexico
  baseUrl: "https://api.mercadolibre.com",
  authUrl: "https://auth.mercadolibre.com.mx/authorization",
}

/**
 * Validates that required environment variables are set
 */
function validateConfig() {
  const required = ["MERCADO_LIBRE_APP_ID", "MERCADO_LIBRE_CLIENT_SECRET"]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

/**
 * Generates OAuth authorization URL for Mercado Libre
 */
export function getAuthorizationUrl() {
  validateConfig()

  const params = new URLSearchParams({
    response_type: "code",
    client_id: ML_CONFIG.appId,
    redirect_uri: ML_CONFIG.redirectUri,
    scope: "read write",
  })

  return `${ML_CONFIG.authUrl}?${params.toString()}`
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForToken(code) {
  validateConfig()

  const response = await fetch(`${ML_CONFIG.baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ML_CONFIG.appId,
      client_secret: ML_CONFIG.clientSecret,
      code: code,
      redirect_uri: ML_CONFIG.redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Refreshes an expired access token
 */
export async function refreshAccessToken(refreshToken) {
  validateConfig()

  const response = await fetch(`${ML_CONFIG.baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CONFIG.appId,
      client_secret: ML_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Authenticates with the Mercado Libre API using OAuth 2.0
 */
export async function authenticateWithMercadoLibre(apiKey, apiSecret) {
  // In a real implementation, this would make an OAuth request to Mercado Libre
  // For simulation, we'll just return a mock token
  return {
    access_token: "mock_access_token_" + Math.random().toString(36).substring(2, 15),
    token_type: "Bearer",
    expires_in: 21600,
    scope: "read write",
    refresh_token: "mock_refresh_token_" + Math.random().toString(36).substring(2, 15),
  }
}

/**
 * Fetches item details from Mercado Libre API based on scanned code
 */
export async function fetchItemDetails(scannedCode, accessToken = null) {
  // In a real implementation, this would:
  // 1. Use the stored OAuth token or request a new one
  // 2. Make an API request to Mercado Libre with the scanned code
  // 3. Parse and return the response

  if (accessToken) {
    try {
      // Real API call would go here
      const response = await fetch(`${ML_CONFIG.baseUrl}/items/${scannedCode}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return {
          orderId: data.id,
          status: data.status,
          sku: data.id,
          title: data.title,
          quantity: data.available_quantity,
          price: data.price,
          buyerName: "N/A",
          shippingInfo: "N/A",
        }
      }
    } catch (error) {
      console.error("Real API call failed, using mock data:", error)
    }
  }

  // For simulation, we'll return mock data after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check if the code looks like an order ID or SKU
      const isOrderId = scannedCode.startsWith("ORD-")

      if (isOrderId) {
        resolve({
          orderId: scannedCode,
          status: ["Pending", "Processing", "Shipped", "Delivered"][Math.floor(Math.random() * 4)],
          sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`,
          title: ["Wireless Headphones", "Smartphone Case", "USB-C Cable", "Power Bank"][Math.floor(Math.random() * 4)],
          quantity: Math.floor(1 + Math.random() * 5),
          buyerName: ["John Doe", "Maria Garcia", "Alex Smith", "Lucia Rodriguez"][Math.floor(Math.random() * 4)],
          shippingInfo: [
            "123 Main St, Apt 4B, New York, NY 10001",
            "456 Oak Ave, Miami, FL 33101",
            "789 Pine Rd, Los Angeles, CA 90001",
            "321 Cedar Ln, Chicago, IL 60007",
          ][Math.floor(Math.random() * 4)],
        })
      } else {
        resolve({
          orderId: `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: ["In Stock", "Low Stock", "Out of Stock", "Discontinued"][Math.floor(Math.random() * 4)],
          sku: scannedCode,
          title: ["Wireless Headphones", "Smartphone Case", "USB-C Cable", "Power Bank"][Math.floor(Math.random() * 4)],
          quantity: Math.floor(1 + Math.random() * 20),
          buyerName: "N/A",
          shippingInfo: "N/A",
        })
      }
    }, 1500)
  })
}

/**
 * Fetches all orders for today from Mercado Libre API
 */
export async function fetchTodaysOrders(accessToken = null) {
  if (accessToken) {
    try {
      // Real API call would go here
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(
        `${ML_CONFIG.baseUrl}/orders/search?seller=${ML_CONFIG.appId}&order.date_created.from=${today}T00:00:00.000-00:00&order.date_created.to=${today}T23:59:59.999-00:00`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        return data.results.map((order) => ({
          orderId: order.id,
          status: order.status,
          sku: order.order_items[0]?.item?.id || "N/A",
          title: order.order_items[0]?.item?.title || "Unknown Item",
          quantity: order.order_items[0]?.quantity || 1,
          price: order.total_amount,
          buyerName: `${order.buyer.first_name} ${order.buyer.last_name}`,
          orderTime: new Date(order.date_created).toLocaleTimeString(),
          shippingInfo: order.shipping?.receiver_address
            ? `${order.shipping.receiver_address.address_line}, ${order.shipping.receiver_address.city}`
            : "N/A",
        }))
      }
    } catch (error) {
      console.error("Real API call failed, using mock data:", error)
    }
  }

  // For simulation, we'll return mock data after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockOrders = []
      const orderCount = Math.floor(5 + Math.random() * 15) // 5-20 orders

      for (let i = 0; i < orderCount; i++) {
        const orderTime = new Date()
        orderTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))

        mockOrders.push({
          orderId: `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: ["Pending", "Processing", "Shipped", "Delivered"][Math.floor(Math.random() * 4)],
          sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`,
          title: [
            "Wireless Bluetooth Headphones",
            "Smartphone Protective Case",
            "USB-C Fast Charging Cable",
            "Portable Power Bank 10000mAh",
            "Bluetooth Speaker Waterproof",
            "Phone Screen Protector",
            "Car Phone Mount",
            "Wireless Charging Pad",
          ][Math.floor(Math.random() * 8)],
          quantity: Math.floor(1 + Math.random() * 5),
          price: (Math.random() * 100 + 10).toFixed(2),
          buyerName: [
            "John Doe",
            "Maria Garcia",
            "Alex Smith",
            "Lucia Rodriguez",
            "Carlos Martinez",
            "Ana Silva",
            "Pedro Santos",
            "Isabella Lopez",
          ][Math.floor(Math.random() * 8)],
          orderTime: orderTime.toLocaleTimeString(),
          shippingInfo: [
            "123 Main St, Apt 4B, New York, NY 10001",
            "456 Oak Ave, Miami, FL 33101",
            "789 Pine Rd, Los Angeles, CA 90001",
            "321 Cedar Ln, Chicago, IL 60007",
            "555 Elm St, Houston, TX 77001",
            "N/A",
          ][Math.floor(Math.random() * 6)],
        })
      }

      // Sort by order time (most recent first)
      mockOrders.sort((a, b) => new Date(`1970/01/01 ${b.orderTime}`) - new Date(`1970/01/01 ${a.orderTime}`))

      resolve(mockOrders)
    }, 1500)
  })
}

/**
 * Fetches all SKUs from Mercado Libre API
 */
export async function fetchAllSKUs(accessToken = null) {
  if (accessToken) {
    try {
      // Real API call would go here
      const response = await fetch(`${ML_CONFIG.baseUrl}/users/me/items/search?status=active`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const items = await Promise.all(
          data.results.map(async (itemId) => {
            const itemResponse = await fetch(`${ML_CONFIG.baseUrl}/items/${itemId}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            })
            const item = await itemResponse.json()

            return {
              sku: item.id,
              title: item.title,
              category: item.category_id,
              stock: item.available_quantity,
              price: item.price,
              supplier: "Mercado Libre",
              location: "N/A",
              lastUpdated: new Date(item.last_updated).toLocaleDateString(),
            }
          }),
        )

        return items
      }
    } catch (error) {
      console.error("Real API call failed, using mock data:", error)
    }
  }

  // For simulation, we'll return mock data after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockSKUs = []
      const skuCount = Math.floor(20 + Math.random() * 30) // 20-50 SKUs

      const categories = ["Electronics", "Accessories", "Audio", "Mobile", "Computing", "Gaming"]
      const suppliers = ["TechCorp", "ElectroMax", "GadgetPro", "MobileTech", "AudioPlus"]
      const locations = ["A1-B2", "C3-D4", "E5-F6", "G7-H8", "I9-J10", "K11-L12"]

      for (let i = 0; i < skuCount; i++) {
        const lastUpdated = new Date()
        lastUpdated.setDate(lastUpdated.getDate() - Math.floor(Math.random() * 30))

        mockSKUs.push({
          sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`,
          title: [
            "Wireless Bluetooth Headphones Premium",
            "Smartphone Protective Case Clear",
            "USB-C Fast Charging Cable 2m",
            "Portable Power Bank 10000mAh",
            "Bluetooth Speaker Waterproof IPX7",
            "Tempered Glass Screen Protector",
            "Adjustable Car Phone Mount",
            "Wireless Charging Pad 15W",
            "Gaming Mouse RGB Backlit",
            "Mechanical Keyboard Blue Switch",
            "Webcam HD 1080p with Microphone",
            "USB Hub 4-Port 3.0",
            "Laptop Stand Adjustable",
            "Phone Ring Holder 360°",
            "Bluetooth Earbuds True Wireless",
          ][Math.floor(Math.random() * 15)],
          category: categories[Math.floor(Math.random() * categories.length)],
          stock: Math.floor(Math.random() * 100),
          price: (Math.random() * 200 + 5).toFixed(2),
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          lastUpdated: lastUpdated.toLocaleDateString(),
        })
      }

      // Sort by SKU
      mockSKUs.sort((a, b) => a.sku.localeCompare(b.sku))

      resolve(mockSKUs)
    }, 2000)
  })
}
