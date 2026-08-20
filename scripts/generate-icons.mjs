import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'static', 'icons', 'app');
const source = path.join(appDir, 'icon-source.svg');

const SIZE = 512;
const MASKABLE_SCALE = 0.65;

async function main() {
  await mkdir(appDir, { recursive: true });

  for (const size of [180, 192, 512]) {
    const buf = await sharp(source).resize(size, size).png().toBuffer();
    await writeFile(path.join(appDir, `icon-${size}.png`), buf);
    console.log(`generated icon-${size}.png (${size}x${size})`);
  }

  const scaledSize = Math.round(SIZE * MASKABLE_SCALE);
  const scaled = await sharp(source).resize(scaledSize, scaledSize).png().toBuffer();
  const maskable = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: 'transparent' },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png()
    .toBuffer();
  await writeFile(path.join(appDir, 'icon-maskable-512.png'), maskable);
  console.log(`generated icon-maskable-512.png (${SIZE}x${SIZE}, content scaled ${scaledSize}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
