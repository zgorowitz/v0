export async function apiRequest(url, accessToken) {
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

export async function paginate(baseUrl, accessToken, options = {}) {
  const { limit = 50, processor } = options
  const results = []
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    const url = `${baseUrl}?offset=${offset}&limit=${limit}`
    const response = await apiRequest(url, accessToken)
    
    if (!response.results || response.results.length === 0) {
      hasMore = false
      break
    }
    
    if (processor) {
      const processed = response.results.map(processor)
      results.push(...processed)
    } else {
      results.push(...response.results)
    }
    
    if (response.paging) {
      hasMore = (response.paging.offset + response.paging.limit) < response.paging.total
      offset = response.paging.offset + response.paging.limit
    } else {
      hasMore = response.results.length === limit
      offset += limit
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

export async function paginateV2(baseUrl, accessToken, options = {}) {
  const { limit = 50, processor } = options
  const results = []
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    const url = `${baseUrl}&offset=${offset}&limit=${limit}`
    const response = await apiRequest(url, accessToken)
    if (!response.results || response.results.length === 0) {
      hasMore = false
      break
    }
    
    if (processor) {
      const processed = response.results.map(processor)
      results.push(...processed)
    } else {
      results.push(...response.results)
    }
    
    if (response.paging) {
      // if (response.paging.total > 10000) { console.error(response.paging.total); break; }
      hasMore = (response.paging.offset + response.paging.limit) < response.paging.total
      offset = response.paging.offset + response.paging.limit
    } else {
      hasMore = response.results.length === limit
      offset += limit
    }
    
    await new Promise(resolve => setTimeout(resolve, 50))
    console.log(`Total results fetched: ${results.length}`)
  }
  return results
}