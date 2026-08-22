// Generate the 1280x640 GitHub social preview from screenshots/.
// Usage: node scripts/generate-social.mjs
import sharp from 'sharp';

const W = 1280;
const H = 640;
const MARGIN = 40;
const GAP = 40;
const BG = '#10141f';

const files = ['gradus-main', 'gradus-forecast', 'gradus-favs'];

const tileW = Math.floor((W - 2 * MARGIN - 2 * GAP) / 3);
const tileH = Math.round((tileW * 1848) / 1224);
const y = Math.round((H - tileH) / 2);

const composites = [];
for (let i = 0; i < files.length; i++) {
	const buf = await sharp(`screenshots/${files[i]}.png`)
		.resize(tileW, tileH)
		.toBuffer();
	composites.push({ input: buf, left: MARGIN + i * (tileW + GAP), top: y });
}

await sharp({
	create: { width: W, height: H, channels: 4, background: BG }
})
	.composite(composites)
	.png()
	.toFile('screenshots/social-preview.png');

console.log(`screenshots/social-preview.png (${W}x${H})`);
