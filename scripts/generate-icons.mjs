import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
    Math.round(lerp(c1[3], c2[3], t)),
  ];
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function paintIcon(x, y, size, maskable) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const nx = (x - cx) / size;
  const ny = (y - cy) / size;

  const bg = [23, 59, 208, 255];
  const ring = [227, 229, 255, 255];
  const planet = [255, 255, 255, 255];
  const core = [186, 195, 255, 255];
  const coreInner = [255, 255, 255, 255];

  let color = bg.slice();

  const scale = maskable ? 0.72 : 0.92;
  const sx = nx / scale;
  const sy = ny / scale;

  const rounded = 0.22;
  const ax = Math.abs(sx) - (0.5 - rounded);
  const ay = Math.abs(sy) - (0.5 - rounded);
  const ox = Math.max(ax, 0);
  const oy = Math.max(ay, 0);
  const inside = Math.min(Math.max(ax, ay), 0) + Math.hypot(ox, oy) - rounded;
  const rectAlpha = clamp01(0.5 - inside * size * scale);

  if (!maskable) {
    color = mix([248, 249, 251, 255], bg, rectAlpha);
    if (rectAlpha < 0.02) return [248, 249, 251, 0];
  }

  const rx = 0.30;
  const ry = 0.17;
  const aa = 1.6 / size;
  const ell = Math.sqrt((sx * sx) / (rx * rx) + (sy * sy) / (ry * ry));
  const ringDist = Math.abs(ell - 1);
  const ringAlpha = clamp01(1 - (ringDist - 0.012) / aa);
  color = mix(color, ring, ringAlpha);

  const angle = 0.85;
  const px = Math.cos(angle) * rx;
  const py = Math.sin(angle) * ry;
  const planetDist = Math.hypot(sx - px, sy - py);
  const planetAlpha = clamp01(1 - (planetDist - 0.052) / aa);
  color = mix(color, planet, planetAlpha);

  const coreDist = Math.hypot(sx, sy);
  const coreAlpha = clamp01(1 - (coreDist - 0.10) / aa);
  color = mix(color, core, coreAlpha);
  const innerAlpha = clamp01(1 - (coreDist - 0.042) / aa);
  color = mix(color, coreInner, innerAlpha);

  if (!maskable) color[3] = Math.round(255 * rectAlpha);
  return color;
}

function createPNG(size, maskable) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paintIcon(x, y, size, maskable);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'pwa-192.png'), createPNG(192, false));
writeFileSync(join(outDir, 'pwa-512.png'), createPNG(512, false));
writeFileSync(join(outDir, 'pwa-512-maskable.png'), createPNG(512, true));
writeFileSync(join(outDir, 'apple-touch-icon.png'), createPNG(180, true));
console.log('Iconos PWA generados en public/icons');
