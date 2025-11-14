// api.js
export const getProductById = async (itemId) => {
  const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'es-AR,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.mercadolibre.com.ar/'
    }
  });

  if (!response.ok) {
    console.error('Response status:', response.status);
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    const text = await response.text();
    console.error('Response body:', text);
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

const product = await getProductById('MLA932389886');

console.log(JSON.stringify(product, null, 2));