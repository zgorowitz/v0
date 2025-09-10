


// API request with auth
async function apiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}
const i =  'MLA1258017647&ids=MLA1257889450&ids=MLA1263258401'
const itemsDetail = await apiRequest(
    `https://api.mercadolibre.com/items?ids=${i}`,
    'APP_USR-6886489775331379-091014-a25716c9127c7b94dc2987e7cd90c993-198126973'
)
console.log(itemsDetail)