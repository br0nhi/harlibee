// Pravi Open Graph sliku (1200×630 PNG) za dijeljenje na Facebooku, WhatsAppu i sl.
//
// Upotreba:
//   npm install --no-save playwright && npx playwright install chromium   (jednom)
//   node scripts/make-og.mjs "Naslov članka" og-naziv-clanka.png ["Kratki podnaslov"] ["arapski tekst"]
//
// Slika se sprema u assets/img/og/. Dodatno:
//   node scripts/make-og.mjs --icon   -> pravi assets/img/apple-touch-icon.png (180×180)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = readFileSync(join(root, "assets/img/logo.svg"), "utf8");
const args = process.argv.slice(2);

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Fontovi se ugrađuju iz assets/fonts, pa skripta radi i bez interneta.
const fontFace = (family, weight, file) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(join(root, "assets/fonts", file)).toString("base64")}) format("woff2")}`;
const fonts = `<style>${[
  fontFace("Lora", 700, "Lora-700-latin.woff2"),
  fontFace("LoraExt", 700, "Lora-700-latin-ext.woff2"),
  fontFace("Source Sans 3", "600 700", "SourceSans3-600-latin.woff2"),
  fontFace("SourceExt", "600 700", "SourceSans3-600-latin-ext.woff2"),
  fontFace("Amiri", 700, "Amiri-700-arabic.woff2"),
].join("")}</style>`;

const pattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23FFC83D' stroke-opacity='.09' stroke-width='1.2'%3E%3Cpath d='M40 8l9.4 22.6L72 40l-22.6 9.4L40 72l-9.4-22.6L8 40l22.6-9.4z'/%3E%3Cpath d='M17.4 17.4L40 26.8l22.6-9.4-9.4 22.6 9.4 22.6L40 53.2l-22.6 9.4 9.4-22.6z'/%3E%3Ccircle cx='40' cy='40' r='7'/%3E%3C/g%3E%3C/svg%3E")`;

function ogHtml(title, subtitle, arabic) {
  return `<!doctype html><html><head><meta charset="utf-8">${fonts}<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#120A1F ${pattern};color:#F7F3FF;font-family:"Source Sans 3","SourceExt",sans-serif;position:relative;overflow:hidden}
  .glow{position:absolute;inset:0;background:radial-gradient(700px 400px at 100% 0%,rgba(255,200,61,.16),transparent 60%),radial-gradient(600px 400px at 0% 100%,rgba(255,122,26,.12),transparent 60%)}
  .frame{position:absolute;inset:28px;border:2px solid rgba(255,200,61,.55);border-radius:28px}
  .wrap{position:absolute;inset:80px 90px;display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:18px;font:700 40px "Lora","LoraExt",serif;color:#FFC83D}
  .brand svg{width:70px;height:70px}
  .brand small{display:block;font:700 20px "Source Sans 3","SourceExt";letter-spacing:.14em;text-transform:uppercase;color:#F7F3FF;margin-top:4px}
  h1{font:700 ${title.length > 60 ? 58 : 68}px/1.15 "Lora","LoraExt",serif;color:#FFC83D;max-width:${arabic ? 560 : 1000}px}
  p{font:600 30px/1.35 "Source Sans 3","SourceExt";color:#F7F3FF;max-width:900px;margin-top:22px}
  .bar{width:120px;height:8px;border-radius:8px;background:#FF7A1A;margin-bottom:28px}
  .main{display:flex;align-items:center;justify-content:space-between;gap:40px}
  .ar{flex:none;max-width:400px;text-align:center;font:700 96px/1.35 "Amiri",serif;color:#FFC83D;direction:rtl}
  .url{font:700 24px "Source Sans 3","SourceExt";color:#F7F3FF;letter-spacing:.04em}
  </style></head><body><div class="glow"></div><div class="frame"></div>
  <div class="wrap">
    <div class="brand">${logo}<div>Harlibee<small>Islamska edukacija</small></div></div>
    <div class="main"><div><div class="bar"></div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${arabic ? `<div class="ar" lang="ar">${esc(arabic)}</div>` : ""}</div>
    <div class="url">youtube.com/@harlibee</div>
  </div></body></html>`;
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage();

if (args[0] === "--icon") {
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<html><body style="margin:0;background:#120A1F;display:grid;place-items:center;width:180px;height:180px"><div style="width:150px;height:150px">${logo}</div></body></html>`);
  const out = join(root, "assets/img/apple-touch-icon.png");
  await page.screenshot({ path: out });
  console.log("Spremljeno:", out);
} else {
  const [title, file, subtitle = "", arabic = ""] = args;
  if (!title || !file) {
    console.error('Upotreba: node scripts/make-og.mjs "Naslov" og-ime.png ["Podnaslov"] ["arapski"]');
    process.exit(1);
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHtml(title, subtitle, arabic), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const out = join(root, "assets/img/og", file);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: "png" });
  console.log("Spremljeno:", out);
}
await browser.close();
