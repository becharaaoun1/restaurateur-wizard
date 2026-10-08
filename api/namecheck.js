// POST /api/namecheck  { name: "Harry's Pizza" }
//   -> { name, slug, places: [...], companies: {available, items:[...]}, domains: [{domain, status}], links }
// First check of a restaurant name: London places with the same name (Google Places), UK companies (Companies House),
// .com and .co.uk domains (public RDAP). Trade marks have no free public API, so we return search links instead.
const GOOGLE = process.env.GOOGLE_MAPS_API_KEY;
const CH = process.env.COMPANIES_HOUSE_API_KEY;

// Greater London, roughly.
const LONDON = { rectangle: { low: { latitude: 51.28, longitude: -0.52 }, high: { latitude: 51.70, longitude: 0.34 } } };
const FILLER = /\b(the|restaurant|restaurants|ltd|limited|plc|llp|cafe|café|kitchen|bar|london|uk|co|and|&)\b/g;
const plain = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]s\b/g, "s");
const norm = s => plain(s).replace(FILLER, " ").replace(/[^a-z0-9]+/g, "") || plain(s).replace(/[^a-z0-9]+/g, "");
const match = (a, b) => { const x = norm(a), y = norm(b); return !x || !y ? null : x === y ? "same" : x.includes(y) || y.includes(x) ? "similar" : null; };

async function places(name) {
  if (!GOOGLE) return { available: false, items: [] };
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.businessStatus,places.googleMapsUri,places.primaryTypeDisplayName" },
    body: JSON.stringify({ textQuery: name, pageSize: 20, regionCode: "GB", locationRestriction: LONDON }),
  });
  if (!r.ok) return { available: false, items: [] };
  const j = await r.json();
  const items = (j.places || []).map(p => ({ name: p.displayName?.text, address: p.formattedAddress, status: p.businessStatus || "OPERATIONAL",
    type: p.primaryTypeDisplayName?.text || null, mapsUrl: p.googleMapsUri, match: match(name, p.displayName?.text) })).filter(p => p.match);
  return { available: true, items };
}

async function companies(name) {
  if (!CH) return { available: false, items: [] };
  const r = await fetch(`https://api.company-information.service.gov.uk/search/companies?items_per_page=20&q=${encodeURIComponent(name)}`, {
    headers: { Authorization: "Basic " + Buffer.from(CH + ":").toString("base64") },
  });
  if (!r.ok) return { available: false, items: [] };
  const j = await r.json();
  const items = (j.items || []).map(c => ({ name: c.title, status: c.company_status, created: c.date_of_creation || null, number: c.company_number,
    url: `https://find-and-update.company-information.service.gov.uk/company/${c.company_number}`, match: match(name, c.title) })).filter(c => c.match);
  return { available: true, items };
}

async function domain(d) {
  const url = d.endsWith(".com") ? `https://rdap.verisign.com/com/v1/domain/${d}` : `https://rdap.nominet.uk/uk/domain/${d}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.timeout(8000) });
    return { domain: d, status: r.status === 404 ? "free" : r.ok ? "taken" : "unknown" };
  } catch { return { domain: d, status: "unknown" }; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method_not_allowed" });
  if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ code: "not_granted" });
  }
  const name = String(req.body?.name || "").trim();
  if (!name || name.length > 80) return res.status(400).json({ code: "bad_request" });
  const slug = String(name).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
  try {
    const [p, c, ...domains] = await Promise.all([places(name), companies(name), ...(slug ? [domain(slug + ".com"), domain(slug + ".co.uk")] : [])]);
    const q = encodeURIComponent(name);
    return res.status(200).json({
      name, slug, places: p, companies: c, domains,
      links: {
        ukTradeMarks: "https://trademarks.ipo.gov.uk/ipo-tmtext",
        euTradeMarks: "https://euipo.europa.eu/eSearch/",
        wipo: "https://branddb.wipo.int/",
        companiesHouse: `https://find-and-update.company-information.service.gov.uk/search/companies?q=${q}`,
      },
    });
  } catch (e) {
    return res.status(502).json({ code: "error", detail: String(e?.message || e).slice(0, 200) });
  }
}
