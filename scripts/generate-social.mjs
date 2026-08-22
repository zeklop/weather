// Generate the 1280x640 GitHub social preview from screenshots/.
// Usage: node scripts/generate-social.mjs
import sharp from 'sharp';

const W = 1280;
const H = 640;
const MARGIN = 30;
const GAP = 24;
const BG = '#10141f';

const files = ['gradus-main', 'gradus-forecast', 'gradus-favs', 'gradus-settings'];

const tileW = Math.floor((W - 2 * MARGIN - 3 * GAP) / 4);
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
	.flatten({ background: BG })
	.jpeg({ quality: 90 })
	.toFile('screenshots/social-preview.jpg');

console.log(`screenshots/social-preview.jpg (${W}x${H})`);
