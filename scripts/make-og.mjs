// Pravi Open Graph sliku (1200×630 PNG) za dijeljenje na Facebooku, WhatsAppu i sl.
//
// Upotreba:
//   npm install --no-save playwright && npx playwright install chromium   (jednom)
//   node scripts/make-og.mjs "Naslov članka" og-naziv-clanka.png ["Kratki podnaslov"] ["arapski tekst"]
//
// Slika se sprema u assets/img/og/. Dodatno:
//   node scripts/make-og.mjs --icons
//     iz originalnog loga (scripts/izvor/harlibee-logo.webp) ponovo pravi logo,
//     znak za zaglavlje (pčelica na polumjesecu), favicon i ikonice za mobitel.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dataUri = (file, type) => `data:${type};base64,${readFileSync(join(root, file)).toString("base64")}`;

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Fontovi se ugrađuju iz assets/fonts, pa skripta radi i bez interneta.
const fontFace = (family, weight, file) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url(${dataUri("assets/fonts/" + file, "font/woff2")}) format("woff2")}`;
const fonts = () => `<style>${[
  fontFace("Lora", 700, "Lora-700-latin.woff2"),
  fontFace("LoraExt", 700, "Lora-700-latin-ext.woff2"),
  fontFace("Source Sans 3", "600 700", "SourceSans3-600-latin.woff2"),
  fontFace("SourceExt", "600 700", "SourceSans3-600-latin-ext.woff2"),
  fontFace("Amiri", 700, "Amiri-700-arabic.woff2"),
].join("")}</style>`;

const pattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23FFC83D' stroke-opacity='.09' stroke-width='1.2'%3E%3Cpath d='M40 8l9.4 22.6L72 40l-22.6 9.4L40 72l-9.4-22.6L8 40l22.6-9.4z'/%3E%3Cpath d='M17.4 17.4L40 26.8l22.6-9.4-9.4 22.6 9.4 22.6L40 53.2l-22.6 9.4 9.4-22.6z'/%3E%3Ccircle cx='40' cy='40' r='7'/%3E%3C/g%3E%3C/svg%3E")`;

function ogHtml(title, subtitle, arabic) {
  const logo = dataUri("assets/img/logo.png", "image/png");
  return `<!doctype html><html><head><meta charset="utf-8">${fonts()}<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#120A1F ${pattern};color:#F7F3FF;font-family:"Source Sans 3","SourceExt",sans-serif;position:relative;overflow:hidden}
  .glow{position:absolute;inset:0;background:radial-gradient(520px 420px at 83% 50%,rgba(255,200,61,.20),transparent 65%),radial-gradient(600px 400px at 0% 100%,rgba(255,122,26,.12),transparent 60%)}
  .frame{position:absolute;inset:28px;border:2px solid rgba(255,200,61,.55);border-radius:28px}
  .wrap{position:absolute;top:78px;bottom:78px;left:90px;width:610px;display:flex;flex-direction:column;justify-content:space-between}
  .kicker{font:700 22px "Source Sans 3","SourceExt";letter-spacing:.16em;text-transform:uppercase;color:#F7F3FF}
  .kicker b{color:#FFC83D}
  .ar{font:700 44px/1.5 "Amiri",serif;color:#FFC83D;direction:rtl;text-align:left;margin-bottom:6px}
  h1{font:700 ${title.length > 55 ? 50 : 62}px/1.15 "Lora","LoraExt",serif;color:#FFC83D}
  p{font:600 29px/1.35 "Source Sans 3","SourceExt";color:#F7F3FF;margin-top:20px}
  .bar{width:120px;height:8px;border-radius:8px;background:#FF7A1A;margin-bottom:26px}
  .url{font:700 24px "Source Sans 3","SourceExt";color:#F7F3FF;letter-spacing:.04em}
  .logo{position:absolute;right:64px;top:50%;transform:translateY(-50%);height:470px;filter:drop-shadow(0 12px 30px rgba(0,0,0,.55))}
  </style></head><body><div class="glow"></div><div class="frame"></div>
  <img class="logo" src="${logo}" alt="">
  <div class="wrap">
    <div class="kicker"><b>Harlibee</b> · Islamska edukacija</div>
    <div><div class="bar"></div>${arabic ? `<div class="ar" lang="ar">${esc(arabic)}</div>` : ""}<h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
    <div class="url">youtube.com/@harlibee</div>
  </div></body></html>`;
}

// Izvedenice loga, pravljene u pregledniku (canvas) da ne treba ImageMagick.
async function makeIcons(page) {
  const src = dataUri("scripts/izvor/harlibee-logo.webp", "image/webp");
  await page.setContent("<body></body>");
  const files = await page.evaluate(async (d) => {
    const img = new Image();
    img.src = d;
    await img.decode();
    const out = {};
    const scale = (source, w, h, bg, pad = 0) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
      x.drawImage(source, pad, pad, w - 2 * pad, h - 2 * pad);
      return c;
    };
    const png = (c) => c.toDataURL("image/png").split(",")[1];
    const webp = (c) => c.toDataURL("image/webp", 0.9).split(",")[1];

    // Puni logo, obrezan na sadržaj.
    const full = document.createElement("canvas");
    full.width = 1000; full.height = 1246;
    full.getContext("2d").drawImage(img, 123, 5, 1000, 1246, 0, 0, 1000, 1246);
    const f480 = scale(full, 480, 598);
    out["logo.webp"] = webp(f480);
    out["logo.png"] = png(f480);

    // Znak: polumjesec i pčelica bez trake s natpisom (čitljiv i u malim veličinama).
    const X0 = 105, X1 = 1135, Y1 = 832, FADE = 55, W = X1 - X0, H = Y1;
    const mark = document.createElement("canvas");
    mark.width = W; mark.height = W;
    const m = mark.getContext("2d");
    const oy = (W - H) / 2;
    m.drawImage(img, X0, 0, W, H, 0, oy, W, H);
    const g = m.createLinearGradient(0, 0, 0, W);
    g.addColorStop(0, "#000");
    g.addColorStop((oy + H - FADE) / W, "#000");
    g.addColorStop((oy + H) / W, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    m.globalCompositeOperation = "destination-in";
    m.fillStyle = g;
    m.fillRect(0, 0, W, W);

    const m128 = scale(mark, 128, 128);
    out["logo-mark.webp"] = webp(m128);
    out["logo-mark.png"] = png(m128);
    out["favicon-32.png"] = png(scale(mark, 32, 32));
    out["favicon-192.png"] = png(scale(mark, 192, 192, "#120A1F", 10));
    out["favicon-512.png"] = png(scale(mark, 512, 512, "#120A1F", 28));
    out["apple-touch-icon.png"] = png(scale(mark, 180, 180, "#120A1F", 10));
    return out;
  }, src);
  for (const [name, b64] of Object.entries(files)) {
    writeFileSync(join(root, "assets/img", name), Buffer.from(b64, "base64"));
    console.log("Spremljeno: assets/img/" + name);
  }
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage();

if (args[0] === "--icons") {
  await makeIcons(page);
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
