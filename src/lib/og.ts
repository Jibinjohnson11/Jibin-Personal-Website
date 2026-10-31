/**
 * Open Graph images (1200×630) in the Editorial ink style, rendered at build time with
 * satori (layout → SVG) and sharp (SVG → PNG). Used by src/pages/og/[name].png.ts.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const INK = '#1a1a1a';
const INK_3 = '#69655c';
const PAPER = '#f4f1ea';
const ACCENT = '#a54c26';
const LABEL = '#7a5f2f';
const RULE = 'rgba(26, 26, 26, 0.15)';

export type OgContent = {
	/** Main line, e.g. the page H1 without its accent words */
	headline: string;
	/** Closing words in italic accent */
	accent?: string;
	/** The site-wide default image: name as the headline, job title below */
	isDefault?: boolean;
};

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
	type,
	props: { style, children },
});

const fontFile = (pkg: string, file: string) => readFile(join(process.cwd(), 'node_modules', pkg, 'files', file));

let fontsPromise: Promise<Parameters<typeof satori>[1]['fonts']> | undefined;
function loadFonts() {
	fontsPromise ??= Promise.all([
		fontFile('@fontsource/instrument-serif', 'instrument-serif-latin-400-normal.woff'),
		fontFile('@fontsource/instrument-serif', 'instrument-serif-latin-400-italic.woff'),
		fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
	]).then(([serif, serifItalic, mono]) => [
		{ name: 'Instrument Serif', data: serif, weight: 400, style: 'normal' },
		{ name: 'Instrument Serif', data: serifItalic, weight: 400, style: 'italic' },
		{ name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
	]);
	return fontsPromise;
}

/** Shrink long headlines so they stay within three lines. */
function headlineSize(text: string) {
	if (text.length <= 16) return 132;
	if (text.length <= 34) return 104;
	if (text.length <= 50) return 88;
	return 76;
}

const mono = (text: string, color = LABEL) =>
	h('div', { fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color }, text);

export async function renderOgImage({ headline, accent, isDefault = false }: OgContent): Promise<Buffer> {
	const full = accent ? `${headline} ${accent}` : headline;

	const title = h(
		'div',
		{ display: 'flex', flexWrap: 'wrap', fontFamily: 'Instrument Serif', fontSize: headlineSize(full), lineHeight: 1.02, letterSpacing: -2, color: INK },
		accent
			? [h('span', { marginRight: '0.22em' }, headline), h('span', { fontStyle: 'italic', color: ACCENT }, accent)]
			: headline,
	);

	const subtitle = isDefault
		? h('div', { display: 'flex', marginTop: 24, fontFamily: 'Instrument Serif', fontSize: 52, color: INK }, [
				h('span', { marginRight: '0.25em' }, 'Web Developer &'),
				h('span', { fontStyle: 'italic', color: ACCENT }, 'SEO Specialist'),
			])
		: null;

	const footer = isDefault
		? h('div', { display: 'flex' }, [mono('Thiruvananthapuram · Kerala · India', INK_3)])
		: h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
				h('div', { fontFamily: 'Instrument Serif', fontSize: 38, color: INK }, 'Jibin Johnson'),
				mono('Web Developer & SEO Specialist', INK_3),
			]);

	const content = h(
		'div',
		// Absolute insets instead of padding: satori adds padding on top of height: 100%.
		{ position: 'absolute', top: 72, right: 88, bottom: 64, left: 88, display: 'flex', flexDirection: 'column' },
		[
			h('div', { display: 'flex', alignItems: 'center', flexShrink: 0 }, [h('div', { width: 48, height: 1, backgroundColor: LABEL, marginRight: 20 }), mono('jibinjohnson.in')]),
			// The headline block takes the free space and centres itself in it.
			h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }, subtitle ? [title, subtitle] : [title]),
			h('div', { display: 'flex', flexDirection: 'column', flexShrink: 0 }, [h('div', { height: 1, backgroundColor: RULE, marginBottom: 28 }), footer]),
		],
	);

	const tree = h('div', { width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: PAPER }, [content]);

	const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: await loadFonts() });
	return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}
