# News Aggregator Backend

This backend system automatically fetches RSS feeds from multiple sources every 10 minutes and updates the Firebase Realtime Database with the latest headlines.

## Setup Instructions

### 1. Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (trending-news-8d416).
3. Go to Project Settings > Service Accounts.
4. Click "Generate new private key" and download the JSON file.
5. Rename it to `serviceAccountKey.json` and place it in the root directory of this project.

### 2. GitHub Secrets

1. In your GitHub repository, go to Settings > Secrets and variables > Actions.
2. Add a new repository secret named `FIREBASE_SERVICE_ACCOUNT_KEY`.
3. Copy the entire contents of `serviceAccountKey.json` and paste it as the secret value.

### 3. Local Testing

To test locally:

```bash
npm install
node rss-fetcher.js
```

### 4. Deployment

The GitHub Actions workflow will automatically run every 10 minutes. You can also trigger it manually from the Actions tab.

## Files

- `package.json`: Dependencies
- `rss-fetcher.js`: Main script to fetch and parse RSS feeds
- `.github/workflows/rss-update.yml`: GitHub Actions workflow
- `serviceAccountKey.json`: Firebase service account key (not committed)

## Data Structure

Items are stored in Firebase at:
- `items/[id]`: Item data
- `byDate/YYYYMMDD/[id]`: Index by date

Each item has: id, title, link, pubDate (ms), source, image, summary.
