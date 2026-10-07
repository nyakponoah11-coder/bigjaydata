const fs = require('fs');

async function searchChunks() {
  try {
    const res = await fetch('https://datamartgh.shop', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const scriptRegex = /src=["'](\/_next\/static\/chunks\/[^"']+)["']/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    
    for (const s of scripts) {
      const scriptUrl = 'https://datamartgh.shop' + s;
      try {
        const sRes = await fetch(scriptUrl);
        const code = await sRes.text();
        if (code.includes('LIVE DELIVERY') || code.includes('delivery-tracker') || code.includes('Fast lane') || code.includes('fastLane') || code.includes('trackingId')) {
          console.log('FOUND IN CHUNK:', scriptUrl);
          // print snippet
          const idx = code.indexOf('delivery-tracker') !== -1 ? code.indexOf('delivery-tracker') : code.indexOf('Fast lane');
          console.log('Snippet:', code.substring(Math.max(0, idx - 100), idx + 200));
        }
      } catch (e) {
        // skip
      }
    }
    console.log('Finished chunk scanning');
  } catch (err) {
    console.error(err);
  }
}

searchChunks();
