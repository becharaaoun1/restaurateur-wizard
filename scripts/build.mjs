// Turns the app page (src/app.html, the same page as the Claude artifact) into public/index.html,
// loading web.js first so the page talks to our own /api instead of Claude's artifact runtime.
import { readFileSync, writeFileSync } from "node:fs";

const app = readFileSync("src/app.html", "utf8");
const at = app.indexOf("<script>");
if (at < 0) throw new Error("src/app.html has no inline <script>");
const head = `<!doctype html>
<html lang="en-GB">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>">
`;
writeFileSync("public/index.html", head + app.slice(0, at) + '<script src="/web.js"></script>\n' + app.slice(at));
console.log("Built public/index.html");
