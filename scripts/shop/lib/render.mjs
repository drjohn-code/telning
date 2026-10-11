// Render HTML or SVG to PNG / WebP with Playwright (Chromium), for the shop art and the product photos.
// A tiny local server serves public/ (fonts) and the page being rendered, so fonts load like on the site.
import { chromium } from '@playwright/test';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './svg.mjs';

const TYPES = { '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

export const TOKENS_CSS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');

export async function studio() {
  const pages = new Map();
  let n = 0;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/studio') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(pages.get(url.searchParams.get('id')) || '');
    }
    const file = join(ROOT, 'public', decodeURIComponent(url.pathname));
    if (!file.startsWith(join(ROOT, 'public')) || !existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });

  /** Render one HTML document; returns a PNG buffer of the viewport (or of `selector`). */
  async function shoot(html, { width, height, scale = 1, selector, omitBackground = false } = {}) {
    const id = String(++n);
    pages.set(id, html);
    await page.setViewportSize({ width, height });
    if (scale !== 1) {
      // deviceScaleFactor is fixed per page; emulate it with CSS zoom on the root instead
    }
    await page.goto(`${base}/studio?id=${id}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const buf = selector
      ? await page.locator(selector).first().screenshot({ type: 'png', omitBackground })
      : await page.screenshot({ type: 'png', omitBackground });
    pages.delete(id);
    return buf;
  }

  async function close() { await browser.close(); server.close(); }
  return { shoot, close, base, browser };
}

/** A bare HTML page that shows one SVG (or HTML) at an exact pixel size. */
export function page(inner, { width, height, background = 'transparent', css = '' } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${TOKENS_CSS}
html,body{margin:0;padding:0}body{width:${width}px;height:${height}px;overflow:hidden;background:${background};font-family:var(--font-text)}
.fit>svg,.fit>img{display:block;width:${width}px;height:${height}px}${css}</style></head><body><div class="fit">${inner}</div></body></html>`;
}

/** Save a PNG buffer as WebP at one or more widths: out/<name>-<w>.webp */
export async function saveWebp(png, out, widths, { quality = 82 } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const files = [];
  for (const w of widths) {
    const f = `${out}-${w}.webp`;
    await sharp(png).resize({ width: w, withoutEnlargement: false }).webp({ quality, effort: 5 }).toFile(f);
    files.push(f);
  }
  return files;
}

export function savePng(png, file) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
  return file;
}
