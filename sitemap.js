// Generate sitemap.xml for post.html?id=ID URLs
// Run: node sitemap.js
// Prereq: npm init -y && npm i node-fetch@2

const fs = require('fs');
const fetch = require('node-fetch');

// CHANGE THIS TO YOUR DEPLOYED DOMAIN (no trailing slash)
const SITE = 'https://news-rouge-beta.vercel.app';

// Firebase Realtime Database endpoint
const API_URL = 'https://trending-news-8d416-default-rtdb.asia-southeast1.firebasedatabase.app/items.json';

function isoFromPubDate(pubDate) {
  // pubDate already stored as ms epoch in your DB
  try {
    const n = Number(pubDate);
    return new Date(isNaN(n) ? pubDate : n).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

(async function generate() {
  try {
    console.log('⏳ Fetching items from Firebase...');
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();

    if (!data || typeof data !== 'object') {
      throw new Error('No items found at Firebase endpoint');
    }

    // Build URL entries
    let urls = '';
    const items = Object.values(data)
      .filter(Boolean)
      .sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0))
      .slice(0, 1000); // sitemap best practice: cap to latest 1k

    for (const item of items) {
      const id = item.id || item.key || '';
      if (!id) continue;
      const loc = `${SITE}/post.html?id=${encodeURIComponent(id)}`;
      const lastmod = isoFromPubDate(item.pubDate);
      urls += `\n<url>\n  <loc>${loc}</loc>\n  <lastmod>${lastmod}</lastmod>\n  <changefreq>hourly</changefreq>\n  <priority>0.80</priority>\n</url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n` +
`<url>\n  <loc>${SITE}/</loc>\n  <lastmod>${new Date().toISOString()}</lastmod>\n  <changefreq>hourly</changefreq>\n  <priority>1.00</priority>\n</url>` +
`${urls}\n\n</urlset>\n`;

    fs.writeFileSync('sitemap.xml', xml, 'utf8');
    console.log('✅ sitemap.xml generated.');
  } catch (e) {
    console.error('❌ Failed to generate sitemap:', e.message);
    process.exitCode = 1;
  }
})();