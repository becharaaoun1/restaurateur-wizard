// Hosted web version: stands in for Claude's artifact runtime (window.claude) and adds live Google listings.
(() => {
  const getPw = () => { try { return localStorage.getItem("rw-pw") || ""; } catch { return ""; } };

  async function call(path, body, retry = true) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-password": getPw() },
      body: JSON.stringify(body),
    });
    if (r.status === 401 && retry) {
      const pw = window.prompt("Password for Restaurateur Wizard");
      if (pw) { try { localStorage.setItem("rw-pw", pw); } catch {} return call(path, body, false); }
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.code) {
      const detail = j.detail || (r.status === 504 ? "the server took too long to answer" : `server replied ${r.status}`);
      throw { code: j.code === "upstream_error" ? "error" : j.code || "error", detail };
    }
    return j;
  }

  function parseJSON(text) {
    const t = String(text || "").replace(/```(?:json)?/g, "");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    try { return JSON.parse(t.slice(a, b + 1)); } catch { throw { code: "invalid_json" }; }
  }

  const sample = { json: async (prompt, opts = {}) => parseJSON((await call("/api/claude", { prompt, tier: opts.modelTier })).text) };
  window.claude = { use: async name => (name === "sample" ? sample : null) };
  window.nameCheck = name => call("/api/namecheck", { name });

  const LEVEL = {
    PRICE_LEVEL_INEXPENSIVE: "value", PRICE_LEVEL_MODERATE: "casual",
    PRICE_LEVEL_EXPENSIVE: "premium-casual", PRICE_LEVEL_VERY_EXPENSIVE: "premium",
  };
  const miles = m => (m / 1609.34).toFixed(2) + " mi";
  const line = p => [
    p.name, p.address, miles(p.distanceM),
    p.priceLevel ? `Google price level ${LEVEL[p.priceLevel] || p.priceLevel}` : "no Google price level",
    p.priceRange ? `£${p.priceRange[0] ?? "?"}–£${p.priceRange[1] ?? "?"} per person` : "",
    p.rating ? `${p.rating}★ (${p.reviews} reviews)` : "no rating",
    p.type || "",
  ].filter(Boolean).join(" | ");

  const NAME_RULE = `

NAMING RULE: every restaurant you name anywhere in your answer (competitors, comparables, by_level_names, opened, largest_successful, notes) must either appear as open in the live listings above, or be confirmed open by a web source from the last 12 months. Places you remember that are not in the open listings may have closed: do not name them as open. If you cannot confirm a name, describe the place instead (e.g. "a busy chain pizzeria on the high street").`;
  const LEVELS = ["value", "casual", "premium-casual", "premium"];
  // Every kind of restaurant open around the site, so the price level is judged on the street's real mix, not the borough's name.
  async function scene(loc, radius) {
    const runs = await Promise.allSettled([
      call("/api/places", { term: "restaurants", loc, radius, includedType: "restaurant" }),
      call("/api/places", { term: "upscale fine dining restaurant", loc, radius, includedType: "restaurant", pages: 1 }),
      call("/api/places", { term: "cheap eats takeaway cafe", loc, radius, pages: 1 }),
    ]);
    const seen = new Map();
    for (const r of runs) if (r.status === "fulfilled") for (const p of r.value.places || []) seen.set(p.mapsUrl || p.name + p.address, p);
    const all = [...seen.values()];
    if (!all.length) return null;
    const open = all.filter(p => p.status === "OPERATIONAL");
    const by = Object.fromEntries([...LEVELS, "unknown"].map(l => [l, []]));
    open.forEach(p => by[LEVEL[p.priceLevel] || "unknown"].push(p));
    const top = l => [...by[l]].sort((a, b) => b.reviews - a.reviews);
    const counts = Object.fromEntries(Object.entries(by).map(([l, v]) => [l, v.length]));
    const prompt = `

WHAT IS OPEN AROUND THE SITE, ALL CUISINES (live Google Maps, checked today, within ${radius} mile): ${open.length} open restaurants and cafés found${all.length - open.length ? `, plus ${all.length - open.length} listed as closed` : ""}.
By Google price level: ${LEVELS.map(l => `${l} ${counts[l]}`).join(", ")}, no price level ${counts.unknown}.
${LEVELS.map(l => `Busiest ${l}: ${top(l).slice(0, 6).map(p => `${p.name} (${p.reviews} reviews${p.rating ? ", " + p.rating + "★" : ""}, ${Math.round(p.distanceM)} m)`).join("; ") || "none found"}`).join("\n")}
Busiest with no price level: ${top("unknown").slice(0, 8).map(p => `${p.name} (${p.type || "restaurant"}, ${p.reviews} reviews)`).join("; ") || "none"}

How to use this: a London area is not one market. Within ${radius} mile there are usually streets and pockets that support premium and others that support casual or value. Judge price_fit from what is actually open and busy here (counts and review numbers above), not from the borough's reputation. A level with several busy, well-reviewed places proves people here pay that much; a level with few places but strong local incomes is a gap. Say in price_fit which levels this patch supports and why, naming places from these lists.`;
    const slim = p => ({ name: p.name, address: p.address, status: p.status, priceLevel: LEVEL[p.priceLevel] || null, rating: p.rating, reviews: p.reviews, mapsUrl: p.mapsUrl, distanceM: p.distanceM, type: p.type });
    return { prompt, counts, total: open.length, closed: all.filter(p => p.status !== "OPERATIONAL").map(slim), top: Object.fromEntries([...LEVELS, "unknown"].map(l => [l, top(l).slice(0, 5).map(slim)])), places: all.map(slim) };
  }

  window.liveCompetitors = async ({ term, loc, radius, concept }) => {
    const [main, sc] = await Promise.all([call("/api/places", { term, loc, radius }), scene(loc, radius).catch(() => null)]);
    const places = main.places || [], address = main.address;
    if (!places.length && !sc) return null;
    const open = places.filter(p => p.status === "OPERATIONAL");
    const shut = places.filter(p => p.status === "CLOSED_PERMANENTLY");
    const temp = places.filter(p => p.status === "CLOSED_TEMPORARILY");
    const prompt = `

LIVE GOOGLE MAPS LISTINGS, checked today, for "${term}" within ${radius} mile of ${address}:
Open (${open.length}):
${open.map((p, i) => `${i + 1}. ${line(p)}`).join("\n") || "none"}
Permanently closed (${shut.length}):
${shut.map(p => "- " + line(p)).join("\n") || "none"}
Temporarily closed (${temp.length}):
${temp.map(p => "- " + line(p)).join("\n") || "none"}

How to use these listings: they are real and current, so they beat your memory. Build competition.nearby from the open listings that genuinely compete with a ${concept} (closest first, copy names and addresses exactly, sure: true). Count saturation.same_concept_count and by_level from them, using the Google price level where given (INEXPENSIVE = value, MODERATE = casual, EXPENSIVE = premium-casual, VERY_EXPENSIVE = premium) and your own judgement where it is missing, and put the names in by_level_names. Put permanently closed listings in churn.closed. Never list a place in competition.nearby or by_level_names unless it is in the open listings above: places you remember that are missing from the open list may have closed or moved, so leave them out (or put them in churn.closed only if you know they closed). Google returns at most 60 results, so if there are 50 or more, say the true count may be higher.`;
    const slim = places.map(p => ({ name: p.name, address: p.address, status: p.status, priceLevel: LEVEL[p.priceLevel] || null,
      priceRange: p.priceRange, rating: p.rating, reviews: p.reviews, mapsUrl: p.mapsUrl, distanceM: p.distanceM }));
    return { count: places.length, term, prompt: prompt + (sc?.prompt || "") + NAME_RULE, places: slim, scene: sc };
  };
})();
