# Restaurateur Wizard (web)

The same app as the Claude artifact, hosted on Vercel, with live data:

- `api/places.js` pulls live listings from **Google Places API (New)**: real names, addresses, price levels, ratings and open or permanently closed status, within the chosen radius.
- `api/claude.js` runs Claude's analysis (`claude-opus-5-5`). The full area read can search the web for recent openings, closures and rents.
- `public/web.js` connects the page to those two routes.
- `src/app.html` is the app page itself. `npm run build` turns it into `public/index.html`.

## Deploy

1. Import this repository at vercel.com → Add New → Project. Keep the defaults; `vercel.json` sets everything else.
2. Under Settings → Environment Variables, add:
   - `GOOGLE_MAPS_API_KEY`: a Google Cloud key restricted to Places API (New)
   - `ANTHROPIC_API_KEY`: a key from console.anthropic.com
   - `APP_PASSWORD` (optional but recommended): visitors are asked for it once, so strangers can't spend your API credit
3. Redeploy.

## Costs

Each full analysis makes up to 4 Google Text Search calls and one Claude call with a few web searches.
