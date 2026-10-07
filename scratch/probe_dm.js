async function probeEndpoints() {
  const candidates = [
    'https://api.datamartgh.shop/api/developer/delivery-tracker',
    'https://api.datamartgh.shop/api/developer/tracker',
    'https://api.datamartgh.shop/api/developer/orders/recent',
    'https://api.datamartgh.shop/api/developer/queue',
    'https://api.datamartgh.shop/api/developer/stats',
    'https://api.datamartgh.shop/api/developer/status',
    'https://api.datamartgh.shop/api/delivery-tracker',
    'https://api.datamartgh.shop/api/tracker',
    'https://api.datamartgh.shop/delivery-tracker',
    'https://api.datamartgh.shop/tracker',
    'https://datamartgh.shop/api/tracker',
    'https://datamartgh.shop/api/delivery-tracker',
    'https://datamartgh.shop/tracker',
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      console.log(`${url} -> status ${res.status}`);
      if (res.status !== 404 && res.status !== 502) {
        const text = await res.text();
        console.log(`   Response (${text.length} chars):`, text.substring(0, 300));
      }
    } catch (e) {
      console.log(`${url} -> error: ${e.message}`);
    }
  }
}

probeEndpoints();
