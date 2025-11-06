import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, query, orderByChild, limitToLast } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBbXqP8P7mBJMUav0KB7bID_MQBBTAmsd4",
  authDomain: "trending-news-8d416.firebaseapp.com",
  databaseURL: "https://trending-news-8d416-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trending-news-8d416",
  storageBucket: "trending-news-8d416.appspot.com",
  messagingSenderId: "145845736609",
  appId: "1:145845736609:web:fc93f283ac147168f44ce0"
};

// Vercel serverless handler
export default async function handler(req, res) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const q = query(ref(db, "items"), orderByChild("pubDate"), limitToLast(500));
    const snap = await get(q);
    const items = snap.val() || {};

    const baseUrl = "https://news-rouge-beta.vercel.app/";

    const urls = Object.entries(items)
      .sort((a,b)=>b[1].pubDate - a[1].pubDate)
      .map(([id, item]) => {
        const loc = `${baseUrl}/#/post/${id}`;
        const lastmod = new Date(item.pubDate).toISOString();
        return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      }).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (err) {
    console.error("Sitemap error", err);
    res.status(500).send("Error generating sitemap");
  }
}
