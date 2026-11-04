/**
 * Generates the favicon set in public/ from the "J" monogram artwork in src/assets/brand/.
 * Run once after changing the artwork:  node scripts/generate-icons.mjs
 *
 * favicon.ico          16, 32 and 48px (PNGs inside an ICO container), rounded corners
 * favicon-96.png       sharper tab icon for high-density screens, rounded corners
 * apple-touch-icon.png 180px
 * icon-192.png / icon-512.png   for site.webmanifest
 */
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = 'src/assets/brand/monogram-source.png';

// Square crop centred on the J (artwork is 1536×1024, the letter sits around 560–976 × 244–743).
const CROP = { left: 488, top: 214, width: 560, height: 560 };

const base = await sharp(SOURCE).extract(CROP).toBuffer();

// Rounded corners for browser tabs; square (full-bleed) for iOS and the manifest, which add their own mask.
const png = async (size, rounded) => {
	let img = sharp(base).resize(size, size, { kernel: 'lanczos3' });
	if (rounded) {
		const r = Math.round(size * 0.1875);
		const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`);
		img = img.composite([{ input: mask, blend: 'dest-in' }]);
	}
	return img.png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
};

await writeFile('public/favicon-96.png', await png(96, true));
await writeFile('public/apple-touch-icon.png', await png(180, false));
await writeFile('public/icon-192.png', await png(192, false));
await writeFile('public/icon-512.png', await png(512, false));

// ICO container holding 16, 32 and 48px PNGs.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(size, true)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4); // image count
let offset = header.length;
sizes.forEach((size, i) => {
	const entry = 6 + 16 * i;
	header.writeUInt8(size, entry); // width
	header.writeUInt8(size, entry + 1); // height
	header.writeUInt8(0, entry + 2); // palette colours
	header.writeUInt8(0, entry + 3); // reserved
	header.writeUInt16LE(1, entry + 4); // colour planes
	header.writeUInt16LE(32, entry + 6); // bits per pixel
	header.writeUInt32LE(images[i].length, entry + 8); // image size
	header.writeUInt32LE(offset, entry + 12); // image offset
	offset += images[i].length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...images]));

console.log('Icons written to public/');
