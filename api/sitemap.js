import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "trending-news-8d416",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://trending-news-8d416-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  try {
    const snap = await db.ref("items").limitToLast(500).get();
    const items = snap.val() || {};

    const baseUrl = "https://news-rouge-beta.vercel.app";

    const urls = Object.entries(items)
      .sort((a, b) => b[1].pubDate - a[1].pubDate)
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
      })
      .join("");

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
    console.error("❌ Sitemap generation error:", err);
    res.status(500).send("Error generating sitemap");
  }
}
