/**
 * Generates the ten service illustrations in src/assets/images/services/ as transparent WebP.
 * Run after changing a scene:  node scripts/generate-service-art.mjs
 *
 * Each scene is its own composition with its own accent colours, but they share one camera
 * (true isometric) and one light: from the top left, so top faces are lightest, left faces
 * are the base colour and right faces are darkest. That keeps the set consistent.
 * Scenes are drawn as SVG, then rendered at 2x to WebP with sharp.
 */
import { mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';

const W = 400;
const H = 300;
const OUT = 'src/assets/images/services';

/* --- Projection and colour helpers ------------------------------------------------------ */

const OX = 200;
let OY = 190; // set per scene to centre its composition
const C = Math.cos(Math.PI / 6);
const P = (x, y, z) => [OX + (x - y) * C, OY + (x + y) * 0.5 - z];
const f = (n) => n.toFixed(1);
const pts = (list) => list.map((p) => P(...p).map(f).join(',')).join(' ');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const light = (c, t = 0.16) => mix(c, '#ffffff', t);
const dark = (c, t = 0.3) => mix(c, '#000000', t);
/** [top, left, right] for one material under the shared light */
const shade = (c) => [light(c), c, dark(c)];

const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}"${extra}/>`;
const line = (a, b, stroke, width = 1.5, extra = '') => {
	const [x1, y1] = P(...a);
	const [x2, y2] = P(...b);
	return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;
};
const polyline = (list, stroke, width = 2) =>
	`<polyline points="${pts(list)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Axis-aligned box, origin corner (x, y, z), size (w, d, h). colour: hex or [top, left, right]. */
function box(x, y, z, w, d, h, colour) {
	const [top, left, right] = Array.isArray(colour) ? colour : shade(colour);
	return [
		poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left),
		poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right),
		poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top),
	].join('');
}

/** Shapes on the front plane (facing +y, the lit left side) at depth y, given as (x, z) points */
const frontPoly = (xz, y, fill, extra = '') => poly(xz.map(([x, z]) => [x, y, z]), fill, extra);
const frontRect = (x0, x1, z0, z1, y, fill) => frontPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y, fill);
const ring = (cx, cz, r, a0, a1, n = 36) =>
	Array.from({ length: n + 1 }, (_, i) => {
		const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
		return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
	});
const frontCircle = (cx, cz, r, y, fill, extra = '') => frontPoly(ring(cx, cz, r, 0, 360, 48).slice(0, -1), y, fill, extra);
const frontArc = (cx, cz, r0, r1, a0, a1, y, fill) => frontPoly([...ring(cx, cz, r1, a0, a1), ...ring(cx, cz, r0, a1, a0)], y, fill);

/** Shapes on a horizontal plane at height z, given as (x, y) points */
const flatPoly = (xy, z, fill) => poly(xy.map(([x, y]) => [x, y, z]), fill);
const flatRect = (x0, x1, y0, y1, z, fill) => flatPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, fill);

/** Vertical cylinder centred on (cx, cy), from z to z + h. colour: hex or [top, side]. */
function cylinder(cx, cy, z, r, h, colour) {
	const [top, side] = Array.isArray(colour) ? colour : [light(colour, 0.22), colour];
	const [bx, by] = P(cx, cy, z);
	const [tx, ty] = P(cx, cy, z + h);
	const rx = r * Math.SQRT2 * C;
	const ry = r * Math.SQRT2 * 0.5;
	return (
		`<path d="M${f(bx - rx)},${f(by)} A${f(rx)},${f(ry)} 0 0 0 ${f(bx + rx)},${f(by)} L${f(tx + rx)},${f(ty)} L${f(tx - rx)},${f(ty)} Z" fill="${side}"/>` +
		`<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${f(rx)}" ry="${f(ry)}" fill="${top}"/>`
	);
}

/** Lit sphere at a 3D point: screen-space circle with a soft studio highlight */
let gradients = [];
function sphere(x, y, z, r, colour) {
	const id = `s${gradients.length}`;
	gradients.push(
		`<radialGradient id="${id}" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="${light(colour, 0.55)}"/><stop offset="0.45" stop-color="${colour}"/><stop offset="1" stop-color="${dark(colour, 0.45)}"/></radialGradient>`,
	);
	const [sx, sy] = P(x, y, z);
	return `<circle cx="${f(sx)}" cy="${f(sy)}" r="${r}" fill="url(#${id})"/>`;
}

/** Soft contact shadow, so objects sit in space without a platform under them */
const shadow = (cx, cy, rx, ry) => {
	const [sx, sy] = P(cx, cy, 0);
	return `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="${rx}" ry="${ry}" fill="#000" fill-opacity="0.45" filter="url(#blur)"/>`;
};

const svg = (body) => {
	const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>${gradients.join('')}</defs>
${body}
</svg>`;
	gradients = [];
	return out;
};

/* --- Shared materials ---------------------------------------------------------------------- */

const IVORY = '#ece4d0';
const PAPER = '#f4eee0';
const LINE = '#cdc3ab';
const TEAL = '#0b5f56';
const TEAL_L = '#3f9a8d';
const INK = '#1f252b';
const SILVER = '#c3c7cc';

/* --- Scenes -------------------------------------------------------------------------------- */

const scenes = {};

// 1. Website Development: desktop monitor showing a site, a phone beside it for responsive
scenes['web-development'] = () => {
	OY = 196;
	return svg(
		[
			shadow(0, 20, 120, 26),
			box(-30, -6, 0, 60, 34, 4, INK),
			box(-6, 4, 4, 12, 6, 36, '#343b42'),
			box(-82, -4, 34, 164, 8, 96, INK),
			frontRect(-77, 77, 39, 125, 4, PAPER),
			frontRect(-77, 77, 117, 125, 4, LINE),
			frontCircle(-71, 121, 1.8, 4, TEAL_L),
			frontCircle(-65, 121, 1.8, 4, '#c9a25a'),
			frontRect(-70, 4, 76, 112, 4, TEAL),
			frontRect(-64, -18, 100, 105, 4, PAPER),
			frontRect(-64, -32, 92, 96, 4, light(TEAL, 0.35)),
			frontRect(12, 70, 104, 108, 4, LINE),
			frontRect(12, 60, 96, 100, 4, LINE),
			frontRect(12, 38, 82, 89, 4, TEAL_L),
			...[-70, -21, 28].flatMap((x) => [frontRect(x, x + 42, 46, 70, 4, '#e2d9c4'), frontRect(x, x + 42, 64, 70, 4, light(TEAL_L, 0.3))]),
			shadow(86, 50, 22, 8),
			box(74, 42, 0, 26, 4, 54, INK),
			frontRect(76, 98, 4, 50, 46, PAPER),
			frontRect(78, 96, 30, 46, 46, TEAL),
			frontRect(78, 92, 22, 26, 46, LINE),
			frontRect(78, 88, 15, 19, 46, LINE),
			frontRect(78, 90, 6, 11, 46, TEAL_L),
		].join(''),
	);
};

// 2. SEO Services: analytics board with a rising chart, magnifying glass in front
scenes.seo = () => {
	OY = 196;
	const EMERALD = '#2f7d5b';
	const SAGE = '#9db8a0';
	return svg(
		[
			shadow(0, 0, 120, 24),
			box(-80, -24, 0, 150, 6, 112, IVORY),
			frontRect(-74, 64, 98, 106, -18, SAGE),
			frontRect(-74, -40, 76, 92, -18, '#e3ddcb'),
			frontRect(-34, 0, 76, 92, -18, '#e3ddcb'),
			frontRect(6, 40, 76, 92, -18, '#e3ddcb'),
			frontRect(-70, -50, 82, 86, -18, EMERALD),
			frontRect(-30, -14, 82, 86, -18, SAGE),
			frontRect(10, 30, 82, 86, -18, EMERALD),
			...[[-70, 14], [-52, 22], [-34, 30], [-16, 40], [2, 50], [20, 62]].map(([x, h]) => frontRect(x, x + 12, 8, 8 + h, -18, mix(SAGE, EMERALD, h / 70))),
			polyline([[-64, -18, 30], [-46, -18, 38], [-28, -18, 36], [-10, -18, 52], [8, -18, 58], [26, -18, 70], [44, -18, 74]], EMERALD, 2.5),
			frontCircle(44, 74, 3, -18, EMERALD),
			shadow(48, 46, 34, 10),
			frontArc(44, 52, 22, 30, 0, 360, 22, dark(SILVER, 0.35)),
			frontCircle(44, 52, 22, 26, SAGE, ' fill-opacity="0.35"'),
			frontArc(44, 52, 22, 30, 0, 360, 26, SILVER),
			frontPoly([[63, 31], [69, 37], [96, 10], [90, 4]], 22, dark(INK, 0.1)),
			frontPoly([[63, 31], [69, 37], [96, 10], [90, 4]], 26, '#3a4148'),
			frontArc(44, 52, 15, 18, 110, 160, 27, '#ffffff'),
		].join(''),
	);
};

// 3. Python & Django: dark code editor with coloured code, connected to a database
scenes['python-django-development'] = () => {
	OY = 192;
	const BLUE = '#4a6a8a';
	const BLUE_L = '#8fa6bd';
	const EDITOR = '#1c2733';
	const code = [
		[0, 30, BLUE_L], [0, 52, TEAL_L], [10, 40, IVORY], [10, 60, BLUE_L], [20, 34, TEAL_L],
		[10, 46, IVORY], [0, 24, BLUE_L], [0, 56, TEAL_L], [10, 30, IVORY],
	];
	return svg(
		[
			shadow(-10, 10, 110, 22),
			box(-92, -16, 8, 136, 6, 108, EDITOR),
			frontRect(-88, 40, 104, 112, -10, '#26354a'),
			frontCircle(-82, 108, 1.8, -10, '#b8674a'),
			frontCircle(-76, 108, 1.8, -10, '#c9a25a'),
			frontCircle(-70, 108, 1.8, -10, TEAL_L),
			frontRect(-88, -76, 12, 102, -10, '#18212c'),
			...code.map(([indent, len, colour], i) => frontRect(-70 + indent, -70 + indent + len, 92 - i * 9, 95 - i * 9, -10, colour)),
			...code.map((_, i) => frontRect(-85, -79, 92 - i * 9, 95 - i * 9, -10, '#3a4a5c')),
			polyline([[44, -10, 30], [62, -10, 30], [62, 18, 10]], TEAL_L, 2),
			frontCircle(44, 30, 2.5, -10, TEAL_L),
			shadow(70, 34, 34, 12),
			cylinder(70, 34, 0, 26, 18, [light(BLUE, 0.3), BLUE]),
			cylinder(70, 34, 22, 26, 18, [light(BLUE, 0.3), BLUE]),
			cylinder(70, 34, 44, 26, 18, [light(BLUE_L, 0.25), BLUE_L]),
			line([52, 52, 12], [52, 52, 16], TEAL_L, 3),
			line([52, 52, 34], [52, 52, 38], TEAL_L, 3),
		].join(''),
	);
};

// 4. AI-Assisted: neural network of lit nodes in three layers, with a processing ring
scenes['ai-assisted-development'] = () => {
	OY = 200;
	const VIOLET = '#7a6f9b';
	const layers = [
		[[-80, 10, 40], [-80, 10, 85], [-80, 10, 130]],
		[[0, 0, 25], [0, 0, 65], [0, 0, 105], [0, 0, 145]],
		[[80, -10, 60], [80, -10, 110]],
	];
	const links = [];
	for (let l = 0; l < 2; l++) for (const a of layers[l]) for (const b of layers[l + 1]) links.push(line(a, b, SILVER, 1.2, ' stroke-opacity="0.45"'));
	const [rx, ry] = P(0, 0, 85);
	return svg(
		[
			...links,
			`<ellipse cx="${f(rx)}" cy="${f(ry)}" rx="58" ry="20" fill="none" stroke="${TEAL_L}" stroke-opacity="0.5" stroke-width="1.5"/>`,
			...layers[0].map((p) => sphere(...p, 11, VIOLET)),
			...layers[1].map((p, i) => sphere(...p, i === 1 || i === 2 ? 15 : 12, TEAL)),
			...layers[2].map((p) => sphere(...p, 11, VIOLET)),
			sphere(0, 0, 85, 7, SILVER),
		].join(''),
	);
};

// 5. Web Application: laptop running a dashboard with sidebar, line chart, donut and KPI tiles
scenes['web-application-development'] = () => {
	OY = 180;
	const CYAN = '#8cc7c9';
	return svg(
		[
			shadow(0, 40, 120, 30),
			box(-80, -20, 0, 150, 96, 6, SILVER),
			flatRect(-72, 62, -12, 44, 6, dark(SILVER, 0.12)),
			flatRect(-30, 20, 52, 70, 6, dark(SILVER, 0.06)),
			box(-80, -26, 6, 150, 6, 96, INK),
			frontRect(-76, 66, 10, 98, -20, PAPER),
			frontRect(-76, -54, 10, 98, -20, TEAL),
			...[86, 76, 66, 56].map((z) => frontRect(-72, -58, z, z + 4, -20, light(TEAL, 0.35))),
			frontRect(-50, 62, 88, 95, -20, LINE),
			...[-50, -12, 26].map((x) => frontRect(x, x + 34, 68, 82, -20, light(CYAN, 0.45))),
			...[-50, -12, 26].map((x) => frontRect(x + 4, x + 20, 74, 77, -20, TEAL_L)),
			frontRect(-50, 18, 16, 62, -20, '#efe8d8'),
			polyline([[-46, -20, 24], [-34, -20, 34], [-22, -20, 30], [-10, -20, 44], [2, -20, 40], [14, -20, 54]], TEAL, 2),
			polyline([[-46, -20, 20], [-34, -20, 24], [-22, -20, 22], [-10, -20, 30], [2, -20, 34], [14, -20, 38]], CYAN, 2),
			frontArc(42, 39, 11, 19, 90, 330, -20, TEAL_L),
			frontArc(42, 39, 11, 19, 330, 450, -20, CYAN),
		].join(''),
	);
};

// 6. Landing Page: tall page with a terracotta hero, raised call-to-action button and a cursor
scenes['landing-page-development'] = () => {
	OY = 200;
	const TERRA = '#b8674a';
	const DTEAL = '#0f4a44';
	return svg(
		[
			shadow(0, 10, 80, 22),
			box(-46, -4, 0, 92, 6, 150, IVORY),
			frontRect(-42, 42, 140, 147, 2, LINE),
			frontRect(-42, 42, 82, 136, 2, TERRA),
			frontRect(-34, 22, 120, 127, 2, PAPER),
			frontRect(-34, 8, 110, 115, 2, light(TERRA, 0.4)),
			frontRect(-34, 34, 66, 70, 2, LINE),
			frontRect(-34, 18, 60, 63, 2, LINE),
			box(-34, 2, 42, 40, 7, 11, [light(TERRA, 0.2), TERRA, dark(TERRA, 0.35)]),
			...[-34, -9, 16].map((x) => frontRect(x, x + 20, 10, 32, 2, DTEAL)),
			...[-34, -9, 16].map((x) => frontRect(x + 4, x + 12, 24, 28, 2, light(DTEAL, 0.5))),
			frontPoly([[14, 52], [14, 30], [19, 35], [23, 26], [27, 28], [23, 37], [30, 37]], 14, PAPER, ` stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`),
		].join(''),
	);
};

// 7. Hosting & Deployment: cloud above two connected servers, with a deploy arrow rising
scenes['hosting-deployment'] = () => {
	OY = 210;
	const STEEL = '#5a7891';
	const [cx, cy] = P(-10, 0, 150);
	gradients.push(
		`<linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light(STEEL, 0.55)}"/><stop offset="1" stop-color="${light(STEEL, 0.15)}"/></linearGradient>`,
	);
	const cloud = `<g fill="url(#cloud)"><circle cx="${f(cx - 30)}" cy="${f(cy + 6)}" r="20"/><circle cx="${f(cx)}" cy="${f(cy - 8)}" r="28"/><circle cx="${f(cx + 30)}" cy="${f(cy + 4)}" r="22"/><rect x="${f(cx - 50)}" y="${f(cy + 4)}" width="102" height="22" rx="11"/></g>`;
	return svg(
		[
			shadow(-10, 10, 80, 20),
			line([-30, 30, 64], [-30, 30, 112], SILVER, 1.5, ' stroke-dasharray="3 4" stroke-opacity="0.7"'),
			line([10, 30, 64], [10, 30, 118], SILVER, 1.5, ' stroke-dasharray="3 4" stroke-opacity="0.7"'),
			box(-60, -20, 0, 90, 50, 28, STEEL),
			box(-60, -20, 32, 90, 50, 28, STEEL),
			...[0, 32].flatMap((z) => [
				frontRect(-54, -10, z + 16, z + 20, 30, dark(STEEL, 0.35)),
				frontRect(-54, -10, z + 8, z + 12, 30, dark(STEEL, 0.35)),
				frontCircle(14, z + 18, 2.2, 30, TEAL_L),
				frontCircle(21, z + 18, 2.2, 30, light(TEAL_L, 0.5)),
			]),
			cloud,
			shadow(72, 22, 20, 7),
			box(64, 14, 0, 16, 16, 62, [light(TEAL_L, 0.2), TEAL_L, TEAL]),
			poly([[56, 30, 62], [88, 30, 62], [72, 30, 92]], light(TEAL_L, 0.1)),
			poly([[72, 6, 62], [72, 38, 62], [72, 22, 92]], TEAL),
		].join(''),
	);
};

// 8. Maintenance & Support: site with an update bar, refresh badge, security shield and wrench
scenes['website-maintenance'] = () => {
	OY = 196;
	const SAGE = '#6b8a6d';
	const AMBER = '#d19a3f';
	const shield = [[0, 46], [24, 38], [24, 14], [12, 0], [0, -6], [-12, 0], [-24, 14], [-24, 38]].map(([x, z]) => [x + 52, z + 40]);
	return svg(
		[
			shadow(-20, 0, 100, 20),
			box(-86, -24, 0, 124, 6, 104, IVORY),
			frontRect(-82, 34, 92, 100, -18, SAGE),
			frontRect(-76, 10, 70, 84, -18, '#e3ddcb'),
			frontRect(-76, 24, 56, 60, -18, LINE),
			frontRect(-76, 6, 48, 52, -18, LINE),
			frontRect(-76, 24, 30, 38, -18, '#e3ddcb'),
			frontRect(-76, -12, 30, 38, -18, AMBER),
			frontRect(-76, 24, 10, 22, -18, '#e3ddcb'),
			frontCircle(22, 77, 11, -18, AMBER),
			frontArc(22, 77, 5, 7.5, 30, 300, -18, PAPER),
			shadow(52, 34, 30, 9),
			frontPoly(shield, 22, dark(SAGE, 0.35)),
			frontPoly(shield, 26, SAGE),
			polyline([[42, 26, 64], [50, 26, 56], [64, 26, 72]], PAPER, 3),
			shadow(-40, 56, 36, 8),
			box(-60, 50, 0, 50, 9, 4, SILVER),
			cylinder(-66, 54.5, 0, 11, 4, [light(SILVER, 0.2), dark(SILVER, 0.2)]),
			flatRect(-80, -66, 52, 57, 4.1, '#2a3036'),
		].join(''),
	);
};

// 9. Performance Optimization: speed gauge into the green, loading bar and falling load-time bars
scenes['performance-optimization'] = () => {
	OY = 196;
	const LIME = '#a3b85a';
	const steps = 6;
	return svg(
		[
			shadow(-10, 10, 96, 22),
			frontCircle(-20, 78, 62, -12, dark(INK, 0.2)),
			frontCircle(-20, 78, 62, -6, '#2a3036'),
			frontArc(-20, 78, 56, 62, 0, 360, -6, SILVER),
			frontCircle(-20, 78, 55, -6, '#1a2523'),
			...Array.from({ length: steps }, (_, i) =>
				frontArc(-20, 78, 38, 48, 180 - (i * 180) / steps - 2, 180 - ((i + 1) * 180) / steps + 2, -6, mix(TEAL_L, LIME, i / (steps - 1))),
			),
			frontPoly([[-23, 76], [-17, 80], [14, 103], [11, 106]], -6, PAPER),
			frontCircle(-20, 78, 6, -6, SILVER),
			frontRect(-48, 8, 34, 40, -6, '#2a3036'),
			frontRect(-48, -4, 34, 40, -6, LIME),
			shadow(70, 40, 30, 8),
			...[[54, 46], [70, 34], [86, 22], [102, 12]].map(([x, h], i) => box(x - 10, 30, 0, 12, 12, h, i === 3 ? LIME : TEAL_L)),
		].join(''),
	);
};

// 10. Revamp & Redesign: boxy grey old monitor turning into a slim modern screen
scenes['website-redesign'] = () => {
	OY = 196;
	const GREY = '#7d8083';
	const [sx, sy] = P(120, -40, 120);
	return svg(
		[
			shadow(-60, 20, 56, 16),
			box(-96, -8, 0, 64, 52, 58, GREY),
			frontRect(-90, -38, 8, 52, 44, '#4d5053'),
			frontRect(-86, -42, 40, 48, 44, '#8a8d90'),
			frontRect(-86, -66, 14, 36, 44, '#6d7073'),
			frontRect(-62, -42, 28, 36, 44, '#6d7073'),
			frontRect(-62, -42, 14, 24, 44, '#6d7073'),
			flatPoly([[-28, 50], [-6, 28], [-10, 24], [8, 22], [6, 40], [2, 36], [-20, 58]], 0, mix(GREY, TEAL_L, 0.55)),
			shadow(56, -10, 64, 16),
			box(14, -40, 6, 100, 5, 100, IVORY),
			box(54, -30, 0, 20, 14, 6, SILVER),
			frontRect(18, 110, 10, 102, -35, PAPER),
			frontRect(18, 110, 96, 102, -35, LINE),
			frontRect(22, 106, 58, 92, -35, TEAL),
			frontRect(28, 70, 80, 85, -35, PAPER),
			frontRect(28, 58, 72, 76, -35, light(TEAL, 0.4)),
			frontRect(28, 48, 62, 67, -35, TEAL_L),
			...[22, 51, 80].map((x) => frontRect(x, x + 26, 16, 52, -35, '#e3ddcb')),
			...[22, 51, 80].map((x) => frontRect(x, x + 26, 44, 52, -35, light(TEAL_L, 0.35))),
			`<path d="M${f(sx)},${f(sy - 8)} l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3 l8,-3 Z" fill="${PAPER}"/>`,
		].join(''),
	);
};

/* --- Write ------------------------------------------------------------------------------- */

await mkdir(OUT, { recursive: true });
for (const [name, draw] of Object.entries(scenes)) {
	await sharp(Buffer.from(draw()), { density: 144 })
		.resize(W * 2, H * 2)
		.webp({ quality: 86, alphaQuality: 90, effort: 6 })
		.toFile(`${OUT}/${name}.webp`);
	await rm(`${OUT}/${name}.svg`, { force: true }); // older SVG versions of the set
}
console.log(`Service illustrations written to ${OUT}/`);
