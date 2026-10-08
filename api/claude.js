// POST /api/claude  { prompt, tier: "default" | "quick" }  ->  { text }
// The full area analysis may search the web (recent openings, closures, rents); quick calls don't.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const SYSTEM = `You are the analyst behind Restaurateur Wizard, an app that helps founders decide whether to open a restaurant, café or bar in London.
Be conservative and honest. Never invent places, addresses or statistics; when unsure, say so in the fields provided.
Your final answer must be ONLY the JSON object the user asks for, with no text before or after it.`;

const SEARCH_NOTE = `\nYou can search the web. Use a few searches to check recent openings and closures, competitors' prices, typical rents, and how many people live, work and travel near this address (TfL station usage, Census population), then answer. Before naming any restaurant, make sure it is still open: prefer the live listings in the prompt, and treat anything you only remember as possibly closed.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method_not_allowed" });
  if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ code: "not_granted" });
  }
  const { prompt, tier } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 60000) {
    return res.status(400).json({ code: "bad_request" });
  }
  const quick = tier === "quick";
  const params = {
    model: MODEL,
    max_tokens: quick ? 8000 : 32000,
    output_config: { effort: quick ? "low" : "medium" },
    system: SYSTEM + (quick ? "" : SEARCH_NOTE),
    ...(quick ? {} : { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }] }),
  };

  try {
    const messages = [{ role: "user", content: prompt }];
    let msg;
    // A server-tool turn can pause; hand it back so Claude carries on (a few times at most).
    for (let i = 0; i < 4; i++) {
      msg = await client.messages.stream({ ...params, messages }).finalMessage();
      if (msg.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: msg.content });
    }
    if (msg.stop_reason === "refusal") return res.status(200).json({ code: "refused" });
    const text = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  } catch (e) {
    console.error("claude error", e?.status, e?.message);
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ code: "rate_limited" });
    // Pass Claude's own reason through (e.g. bad key, no credit) so the page can show it.
    const detail = !process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY is not set in Vercel"
      : e?.error?.error?.message || e?.message || "unknown error";
    return res.status(502).json({ code: "upstream_error", detail: String(detail).slice(0, 300) });
  }
}
