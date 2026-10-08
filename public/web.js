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

  window.liveCompetitors = async ({ term, loc, radius, concept }) => {
    const { places, address } = await call("/api/places", { term, loc, radius });
    if (!places?.length) return null;
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

How to use these listings: they are real and current, so they beat your memory. Build competition.nearby from the open listings that genuinely compete with a ${concept} (closest first, copy names and addresses exactly, sure: true). Count saturation.same_concept_count and by_level from them, using the Google price level where given (INEXPENSIVE = value, MODERATE = casual, EXPENSIVE = premium-casual, VERY_EXPENSIVE = premium) and your own judgement where it is missing, and put the names in by_level_names. Put permanently closed listings in churn.closed. Google returns at most 60 results, so if there are 50 or more, say the true count may be higher.`;
    return { count: places.length, term, prompt };
  };
})();
