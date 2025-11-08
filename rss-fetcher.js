const admin = require('firebase-admin');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const crypto = require('crypto');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://trending-news-8d416-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = admin.database();

// RSS Sources
const rssSources = [
  { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
  { name: 'India Today', url: 'https://www.indiatoday.in/rss/home' },
  { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Bollywood Hungama', url: 'https://www.bollywoodhungama.com/rss/bollywood-news.xml' },
  { name: 'IGN Entertainment', url: 'https://in.ign.com/feed.xml' },
  { name: 'ESPN Cricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/INtopNews' }
];

// Helper: Generate stable ID
function generateId(title, link) {
  return crypto.createHash('md5').update(title + link).digest('hex');
}

// Helper: Parse date to ms
function parseDate(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? Date.now() : date.getTime();
}

// Helper: Extract image from item
function extractImage(item) {
  // Priority: media:content, enclosure, media:thumbnail, image, then from description
  if (item['media:content'] && item['media:content'][0] && item['media:content'][0].$) {
    return item['media:content'][0].$.url;
  }
  if (item.enclosure && item.enclosure[0] && item.enclosure[0].$.type.startsWith('image/')) {
    return item.enclosure[0].$.url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'][0]) {
    return item['media:thumbnail'][0].$.url;
  }
  if (item.image && item.image[0]) {
    return item.image[0];
  }
  // From description or content
  const html = item['content:encoded'] ? item['content:encoded'][0] : item.description ? item.description[0] : '';
  if (html) {
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  return '/placeholder.jpg';
}

// Helper: Extract summary
function extractSummary(item) {
  return item['content:encoded'] ? item['content:encoded'][0] : item.description ? item.description[0] : '';
}

// Fetch and parse RSS
async function fetchRSS(source) {
  try {
    console.log(`Fetching RSS from ${source.name}...`);
    const response = await fetch(source.url);
    const xml = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    const items = result.rss ? result.rss.channel.item : result.feed.entry;
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      title: item.title,
      link: item.link.$.href || item.link,
      pubDate: parseDate(item.pubDate || item.published || item.updated),
      source: source.name,
      image: extractImage(item),
      summary: extractSummary(item)
    }));
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error.message);
    return [];
  }
}

// Main function
async function updateNews() {
  console.log('Starting news update...');
  const allItems = [];
  for (const source of rssSources) {
    const items = await fetchRSS(source);
    allItems.push(...items);
  }

  // Sort by pubDate desc
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  // Deduplicate and limit to 1000
  const seen = new Set();
  const uniqueItems = [];
  for (const item of allItems) {
    const id = generateId(item.title, item.link);
    if (!seen.has(id)) {
      seen.add(id);
      uniqueItems.push({ ...item, id });
      if (uniqueItems.length >= 1000) break;
    }
  }

  // Write to Firebase
  const updates = {};
  const byDateUpdates = {};
  uniqueItems.forEach(item => {
    updates[`items/${item.id}`] = item;
    const dateKey = new Date(item.pubDate).toISOString().slice(0, 10).replace(/-/g, '');
    byDateUpdates[`byDate/${dateKey}/${item.id}`] = true;
  });

  await db.ref().update(updates);
  await db.ref().update(byDateUpdates);

  console.log(`Updated ${uniqueItems.length} items.`);
  console.log('News update complete.');
}

// Run
updateNews().catch(console.error);
