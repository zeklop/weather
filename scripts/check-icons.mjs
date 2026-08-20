import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'static', 'icons', 'app');

const EXPECTED = [
  { file: 'icon-180.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
];

const SAFE_RADIUS_RATIO = 0.4;
const EPSILON = 1.5;

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

for (const { file, size } of EXPECTED) {
  const filePath = path.join(appDir, file);
  let meta;
  try {
    meta = await sharp(filePath).metadata();
  } catch {
    fail(`${file}: missing or unreadable (${filePath})`);
    continue;
  }
  if (meta.width !== size || meta.height !== size) {
    fail(`${file}: expected ${size}x${size}, got ${meta.width}x${meta.height}`);
  } else {
    console.log(`OK: ${file} ${size}x${size}`);
  }
}

const maskablePath = path.join(appDir, 'icon-maskable-512.png');
if (await import('node:fs/promises').then((fs) => fs.access(maskablePath).then(() => true, () => false))) {
  const { data, info } = await sharp(maskablePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cx = (info.width - 1) / 2;
  const cy = (info.height - 1) / 2;
  const maxR = info.width * SAFE_RADIUS_RATIO + EPSILON;
  let worst = 0;
  let worstAlpha = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 0) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > worst) {
          worst = d;
          worstAlpha = alpha;
        }
      }
    }
  }
  if (worst > maxR) {
    fail(
      `maskable safe-zone: opaque pixel ${worst.toFixed(1)}px from center exceeds ${maxR.toFixed(1)}px (alpha ${worstAlpha})`,
    );
  } else {
    console.log(`OK: maskable safe-zone, farthest opaque pixel ${worst.toFixed(1)}px <= ${maxR.toFixed(1)}px`);
  }
}

if (failed) {
  console.error('icons check FAILED');
  process.exit(1);
}
console.log('icons check passed');
