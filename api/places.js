// POST /api/places  { term: "pizza restaurant", loc: "Earl's Court, London", radius: 0.5 (miles) }
//   -> { center, places: [{ name, address, priceLevel, priceRange, rating, reviews, status, mapsUrl, type, distanceM }] }
// Live listings from Google Places API (New) Text Search, filtered to the radius.
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const URL = "https://places.googleapis.com/v1/places:searchText";
const FIELDS = [
  "places.displayName", "places.formattedAddress", "places.priceLevel", "places.priceRange", "places.rating",
  "places.userRatingCount", "places.businessStatus", "places.googleMapsUri", "places.location", "places.primaryTypeDisplayName",
].join(",");

async function searchText(body, fieldMask) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Places ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

function metres(a, b) {
  const rad = x => (x * Math.PI) / 180, R = 6371000;
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const pounds = m => (m?.units ? Number(m.units) : null);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method_not_allowed" });
  if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ code: "not_granted" });
  }
  if (!KEY) return res.status(503).json({ code: "no_google_key" });
  const { term, loc } = req.body || {};
  const radius = Math.min(Math.max(Number(req.body?.radius) || 0.5, 0.1), 2);
  if (typeof term !== "string" || typeof loc !== "string" || !term.trim() || !loc.trim() || term.length > 80 || loc.length > 200) {
    return res.status(400).json({ code: "bad_request" });
  }

  try {
    const where = /london/i.test(loc) ? loc : `${loc}, London`;
    const geo = await searchText({ textQuery: where, pageSize: 1, regionCode: "GB" }, "places.location,places.formattedAddress");
    const center = geo.places?.[0]?.location;
    if (!center) return res.status(404).json({ code: "location_not_found" });

    const radiusM = radius * 1609.34;
    const body = { textQuery: term, pageSize: 20, regionCode: "GB", locationBias: { circle: { center, radius: radiusM } } };
    const seen = new Map();
    let pageToken;
    for (let page = 0; page < 3; page++) {
      const r = await searchText(pageToken ? { ...body, pageToken } : body, FIELDS + ",nextPageToken");
      for (const p of r.places || []) {
        const distanceM = Math.round(metres(center, p.location));
        if (distanceM > radiusM * 1.1) continue;
        seen.set(p.googleMapsUri || p.displayName?.text + p.formattedAddress, {
          name: p.displayName?.text,
          address: p.formattedAddress,
          priceLevel: p.priceLevel || null,
          priceRange: p.priceRange ? [pounds(p.priceRange.startPrice), pounds(p.priceRange.endPrice)] : null,
          rating: p.rating ?? null,
          reviews: p.userRatingCount ?? 0,
          status: p.businessStatus || "OPERATIONAL",
          mapsUrl: p.googleMapsUri,
          type: p.primaryTypeDisplayName?.text || null,
          distanceM,
        });
      }
      pageToken = r.nextPageToken;
      if (!pageToken) break;
    }
    const places = [...seen.values()].sort((a, b) => a.distanceM - b.distanceM);
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=86400");
    return res.status(200).json({ center, address: geo.places[0].formattedAddress, places });
  } catch (e) {
    console.error("places error", e?.message);
    return res.status(502).json({ code: "upstream_error" });
  }
}
