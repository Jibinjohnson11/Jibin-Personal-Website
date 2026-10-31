// @ts-check
/**
 * Writes dist/_headers with a Content-Security-Policy for Netlify after each build.
 *
 * Inline scripts (the theme/reveal script in BaseLayout) are allowed by their SHA-256
 * hash, computed from the built HTML, so the policy stays correct when a script changes.
 * Google Analytics hosts are only allowed when PUBLIC_GA_ID is set.
 *
 * Styles allow 'unsafe-inline' because the reveal animations use style="--reveal-delay"
 * attributes and Astro may inline small stylesheets. That only covers CSS, not scripts.
 * The other security headers live in netlify.toml.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @param {string} dir @returns {Promise<string[]>} */
async function htmlFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) return htmlFiles(path);
			return entry.name.endsWith('.html') ? [path] : [];
		}),
	);
	return files.flat();
}

// Executable inline scripts only: JSON-LD (type="application/ld+json") is data, not code.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;

/** @param {{ analytics: boolean }} options @returns {import('astro').AstroIntegration} */
export default function csp({ analytics }) {
	return {
		name: 'netlify-csp',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const outDir = fileURLToPath(dir);
				const hashes = new Set();

				for (const file of await htmlFiles(outDir)) {
					const html = await readFile(file, 'utf8');
					for (const [, body] of html.matchAll(INLINE_SCRIPT)) {
						if (body.trim()) hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
					}
				}

				const ga = analytics;
				const policy = [
					"default-src 'self'",
					['script-src', "'self'", ...hashes, ga && 'https://www.googletagmanager.com'],
					"style-src 'self' 'unsafe-inline'",
					['img-src', "'self'", 'data:', ga && 'https://*.google-analytics.com https://*.googletagmanager.com'],
					"font-src 'self'",
					['connect-src', "'self'", 'https://api.web3forms.com', ga && 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com'],
					"form-action 'self' https://api.web3forms.com",
					"manifest-src 'self'",
					"frame-ancestors 'none'",
					"base-uri 'self'",
					"object-src 'none'",
					'upgrade-insecure-requests',
				]
					.map((directive) => (Array.isArray(directive) ? directive.filter(Boolean).join(' ') : directive))
					.join('; ');

				await writeFile(join(outDir, '_headers'), `/*\n  Content-Security-Policy: ${policy}\n`);
				logger.info(`_headers written (${hashes.size} inline script hash${hashes.size === 1 ? '' : 'es'}, analytics ${ga ? 'on' : 'off'})`);
			},
		},
	};
}
