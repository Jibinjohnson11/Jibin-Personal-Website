/**
 * Generates the favicon set in public/ from a "JJ" monogram in Instrument Serif.
 * Run once after changing the design:  node scripts/generate-icons.mjs
 *
 * favicon.svg          vector, ink on paper; switches to the dark palette via prefers-color-scheme
 * favicon.ico          32px (PNG inside an ICO container)
 * apple-touch-icon.png 180px
 * icon-192.png / icon-512.png   for site.webmanifest
 */
import { readFile, writeFile } from 'node:fs/promises';
import satori from 'satori';
import sharp from 'sharp';

const LIGHT = { bg: '#f4f1ea', fg: '#1a1a1a' };
const DARK = { bg: '#141210', fg: '#ede8dd' };

const font = await readFile('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff');

// Satori turns the letters into paths, so the SVG needs no web font.
// Rounded corners for browser tabs; square (full-bleed) for iOS and the manifest, which add their own mask.
const monogram = (radius) => satori(
	{
		type: 'div',
		props: {
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: LIGHT.bg,
				borderRadius: radius,
			},
			children: {
				type: 'div',
				props: {
					style: { fontFamily: 'Instrument Serif', fontSize: 50, letterSpacing: -1, color: LIGHT.fg, marginTop: -4 },
					children: 'JJ',
				},
			},
		},
	},
	{ width: 64, height: 64, fonts: [{ name: 'Instrument Serif', data: font, weight: 400, style: 'normal' }] },
);

const raw = await monogram(12);
const square = await monogram(0);

// Swap the hard-coded colours for classes so the icon can follow the system theme.
const themed = raw
	.replace(/fill="#f4f1ea"/gi, 'class="bg"')
	.replace(/fill="#1a1a1a"/gi, 'class="fg"')
	.replace(
		/(<svg[^>]*>)/,
		`$1<style>.bg{fill:${LIGHT.bg}}.fg{fill:${LIGHT.fg}}@media (prefers-color-scheme:dark){.bg{fill:${DARK.bg}}.fg{fill:${DARK.fg}}}</style>`,
	);

if (!themed.includes('class="bg"') || !themed.includes('class="fg"')) throw new Error('Unexpected satori output: colours not found');
await writeFile('public/favicon.svg', themed);

const png = (svg, size) => sharp(Buffer.from(svg), { density: (72 * size) / 64 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

await writeFile('public/apple-touch-icon.png', await png(square, 180));
await writeFile('public/icon-192.png', await png(square, 192));
await writeFile('public/icon-512.png', await png(square, 512));

// ICO container holding one 32×32 PNG.
const ico32 = await png(raw, 32);
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette colours
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14); // image size
header.writeUInt32LE(header.length, 18); // image offset
await writeFile('public/favicon.ico', Buffer.concat([header, ico32]));

console.log('Icons written to public/');
