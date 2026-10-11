// Writes test QR codes as PNG for a decode check: node scripts/shop/qr-check.mjs <outDir> <text> [text…]
import { qrSvg } from './lib/qr.mjs';
import sharp from 'sharp';
const [out, ...texts] = process.argv.slice(2);
let i = 0;
for (const t of texts) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${qrSvg(t, { size: 400 })}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${out}/qr${i++}.png`);
}
