// RSS Parser for News Aggregator
// Enhanced to extract rich, clean article objects

// Helper: Simple hash for stable ID
function stableHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Helper: Sanitize HTML - remove scripts, styles, iframes, event handlers, javascript: URLs
function sanitizeHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove dangerous elements
  const toRemove = temp.querySelectorAll('script, style, iframe, object, embed');
  toRemove.forEach(el => el.remove());

  // Remove event handlers and javascript: URLs
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Trim to ~1200 characters of text content, but keep HTML structure
  let textLength = 0;
  const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode()) && textLength < 1200) {
    const remaining = 1200 - textLength;
    if (node.textContent.length > remaining) {
      node.textContent = node.textContent.substring(0, remaining) + '...';
    }
    textLength += node.textContent.length;
  }

  // Remove excess nodes after trimming
  const allNodes = Array.from(temp.childNodes);
  for (let i = allNodes.length - 1; i >= 0; i--) {
    if (textLength >= 1200) {
      temp.removeChild(allNodes[i]);
    }
  }

  return temp.innerHTML;
}

// Helper: Extract first image URL from HTML
function firstImageFromHtml(html) {
  if (!html) return null;
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const img = temp.querySelector('img');
  return img ? img.src : null;
}

// Helper: Parse date to ms epoch
function parseDateToMs(dateStr) {
  if (!dateStr) return Date.now();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? Date.now() : date.getTime();
}

// Main function: Parse RSS/Atom XML
function parseRSS(xmlText, sourceName) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Handle parse errors
    if (xmlDoc.querySelector('parsererror')) {
      console.warn('XML parse error for', sourceName);
      return [];
    }

    // Find items (RSS: item, Atom: entry)
    const items = xmlDoc.querySelectorAll('item, entry');
    const results = [];

    items.forEach(item => {
      try {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim() || item.querySelector('link')?.getAttribute('href')?.trim() || '';
        const pubDateStr = item.querySelector('pubDate, published, updated')?.textContent?.trim() || '';
        const pubDate = parseDateToMs(pubDateStr);

        // Image extraction priority
        let image = null;
        // 1. media:content
        const mediaContent = item.querySelector('media\\:content, content');
        if (mediaContent) {
          image = mediaContent.getAttribute('url') || mediaContent.textContent;
        }
        // 2. enclosure
        if (!image) {
          const enclosure = item.querySelector('enclosure');
          if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
            image = enclosure.getAttribute('url');
          }
        }
        // 3. media:thumbnail
        if (!image) {
          const thumbnail = item.querySelector('media\\:thumbnail, thumbnail');
          image = thumbnail?.getAttribute('url');
        }
        // 4. image
        if (!image) {
          const imgTag = item.querySelector('image');
          image = imgTag?.getAttribute('url') || imgTag?.textContent;
        }
        // 5. From content:encoded or description
        if (!image) {
          const contentEncoded = item.querySelector('content\\:encoded, encoded');
          const description = item.querySelector('description, summary');
          const html = contentEncoded?.textContent || description?.textContent;
          image = firstImageFromHtml(html);
        }
        // Fallback
        if (!image) image = '/placeholder.jpg';

        // Summary extraction
        let summary = '';
        const contentEncoded = item.querySelector('content\\:encoded, encoded');
        const description = item.querySelector('description, summary');
        if (contentEncoded) {
          summary = sanitizeHtml(contentEncoded.textContent);
        } else if (description) {
          summary = sanitizeHtml(description.textContent);
        }

        // ID: stable hash from title + link
        const id = stableHash(title + link);

        results.push({
          id,
          title,
          link,
          pubDate,
          source: sourceName,
          image,
          summary
        });
      } catch (e) {
        console.warn('Error parsing item:', e);
      }
    });

    return results;
  } catch (e) {
    console.error('Error parsing RSS for', sourceName, e);
    return [];
  }
}

// Example usage:
// const xmlText = '...'; // RSS XML string
// const items = parseRSS(xmlText, 'NDTV');
// console.log(items);
