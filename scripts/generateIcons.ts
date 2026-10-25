/**
 * scripts/generateIcons.ts — Creates real valid PNG icons for the SpotSync PWA.
 * Uses pure Node.js + zlib (no external dependencies).
 * Run: npx ts-node scripts/generateIcons.ts
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// ── CRC32 helper ───────────────────────────────────────────────────────────────
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG chunk builder ──────────────────────────────────────────────────────────
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

// ── Build a solid-colour square PNG ───────────────────────────────────────────
function makePNG(size: number, r: number, g: number, b: number): Buffer {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const row = Buffer.allocUnsafe(1 + size * 3);
  row[0] = 0;
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array<Buffer>(size).fill(row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── SpotSync brand colour: #2D6A4F (forest green) ─────────────────────────────
const R = 0x2d, G = 0x6a, B = 0x4f;

const sizes: number[] = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const buf  = makePNG(size, R, G, B);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ icon-${size}.png  (${buf.length} bytes)`);
}

// ── Screenshots ────────────────────────────────────────────────────────────────
interface Screenshot { name: string; w: number; h: number; }
const screenshots: Screenshot[] = [
  { name: 'screenshot-wide.png',   w: 1280, h: 800 },
  { name: 'screenshot-mobile.png', w: 390,  h: 844 },
];

for (const { name, w, h } of screenshots) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const row = Buffer.allocUnsafe(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = R;
    row[2 + x * 3] = G;
    row[3 + x * 3] = B;
  }
  const raw  = Buffer.concat(Array<Buffer>(h).fill(row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  const buf = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`✓ ${name}  (${buf.length} bytes)`);
}

console.log('\n✅ All PWA icons generated!');
