import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('Para regenerar iconos: npm install --no-save sharp');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'logo.webp');
const outDir = join(root, 'public', 'icons');
const bg = { r: 11, g: 11, b: 16, alpha: 1 };

mkdirSync(outDir, { recursive: true });

async function write(size, file, extraPad = 0) {
  const inner = Math.round(size * (1 - extraPad * 2));
  const resized = await sharp(src).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  const output = extraPad
    ? await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
        .composite([{ input: resized, left: Math.round(size * extraPad), top: Math.round(size * extraPad) }])
        .png()
        .toFile(file)
    : await sharp(resized).png().toFile(file);
  return output;
}

await write(192, join(outDir, 'pwa-192.png'));
await write(512, join(outDir, 'pwa-512.png'));
await write(512, join(outDir, 'pwa-512-maskable.png'), 0.08);
await write(180, join(outDir, 'apple-touch-icon.png'));
console.log('Iconos PWA generados desde public/logo.webp');
