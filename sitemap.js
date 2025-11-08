const fs = require("fs");
const fetch = require("node-fetch");

async function generateSitemap() {
  const apiURL = "https://trending-news-8d416-default-rtdb.asia-southeast1.firebasedatabase.app/items.json";

  console.log("⏳ Fetching news from Firebase...");
  const res = await fetch(apiURL);
  const data = await res.json();

  let urls = "";

  for (let key in data) {
    const item = data[key];

    const finalUrl = `https://news-rouge-beta.vercel.app/post/${item.id}`;

    urls += `
<url>
  <loc>${finalUrl}</loc>
  <lastmod>${new Date(item.pubDate).toISOString()}</lastmod>
  <changefreq>hourly</changefreq>
  <priority>0.8</priority>
</url>`;
  }

  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<url>
  <loc>https://news-rouge-beta.vercel.app/</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
  <changefreq>hourly</changefreq>
  <priority>1.0</priority>
</url>

${urls}

</urlset>`;

  fs.writeFileSync("sitemap.xml", sitemapXML);
  console.log("✅ Sitemap generated successfully: sitemap.xml");
}

generateSitemap();
