const fs = require('fs');

async function checkSite() {
  try {
    const res = await fetch('https://datamartgh.shop', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    console.log('datamartgh.shop status:', res.status, 'HTML length:', html.length);
    
    // Check if tracker or fast lane is in html
    const keywords = ['fast lane', 'Fast Lane', 'delivery-tracker', 'DELIVERED', 'PENDING', 'CHECKED', 'estimated'];
    for (const kw of keywords) {
      console.log(`Keyword "${kw}":`, html.includes(kw));
    }

    // Extract script tags
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    console.log('Script tags count:', scripts.length);
    for (const s of scripts.slice(0, 10)) {
      console.log('Script:', s);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

checkSite();
