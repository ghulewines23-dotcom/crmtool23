import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/icons";
await mkdir(OUT, { recursive: true });

const S_PATH =
  "M 196 152 C 232 132, 300 130, 318 168 C 334 200, 316 228, 258 250 C 200 272, 154 296, 156 342 C 158 386, 202 410, 258 410 C 310 410, 346 390, 352 356";

function gradientDefs(id) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="38%" stop-color="#2563eb"/>
      <stop offset="74%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>`;
}

function buildSvg({ size, radius, maskable }) {
  const pad = Math.round(size * 0.0625); // safe breathing room
  const rx = radius ?? Math.round(size * 0.22);
  const bg =
    maskable === "rect"
      ? `<rect width="${size}" height="${size}" fill="url(#g)"/>`
      : `<rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${rx}" fill="url(#g)"/>`;

  const scale = maskable === "rect" ? 0.9 : 1;
  const cx = size / 2;
  const cy = size / 2;
  // Glyph center ~(252,274) on a 512 canvas, brute force recenter via transform.
  const t = `${scale} 0 0 ${scale} ${cx - 252 * scale} ${cy - 274 * scale}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradientDefs("g")}<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1e3a8a" flood-opacity="0.35"/>
    </filter></defs>
    ${bg}
    <g transform="${t}" filter="url(#shadow)">
      <path d="${S_PATH}" fill="none" stroke="#ffffff" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="392" cy="120" r="19" fill="#34d399"/>
    </g>
  </svg>`;
}

const jobs = [
  { file: "icon-192x192.png", svg: buildSvg({ size: 512, maskable: false }), out: 192 },
  { file: "icon-512x512.png", svg: buildSvg({ size: 512, maskable: false }), out: 512 },
  { file: "icon-maskable-512x512.png", svg: buildSvg({ size: 512, maskable: "rect" }), out: 512 },
  { file: "apple-touch-icon.png", svg: buildSvg({ size: 192, maskable: true }), out: 180 },
];

for (const job of jobs) {
  const buf = await sharp(Buffer.from(job.svg)).resize(job.out, job.out).png().toBuffer();
  await sharp(buf).toFile(`${OUT}/${job.file}`);
  console.log("wrote", `${OUT}/${job.file}`);
}