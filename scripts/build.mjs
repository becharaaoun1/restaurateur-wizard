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
<link rel="icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0b0d12">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Wizard">
`;
writeFileSync("public/index.html", head + app.slice(0, at) + '<script src="/web.js"></script>\n' + app.slice(at));
console.log("Built public/index.html");
