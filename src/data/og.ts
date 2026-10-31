import { getCollection } from 'astro:content';
import type { OgContent } from '../lib/og';

/**
 * One Open Graph image per page, using the page's H1 as the headline (accent = the italic
 * words). Case studies come from the projects collection. Keep these in step with the H1s;
 * pages missing from this list (404, styleguide) fall back to the default image.
 */
const PAGES: Record<string, Omit<OgContent, 'isDefault'>> = {
	'/': { headline: 'Web Developer and SEO Specialist', accent: 'in Kerala' },
	'/about/': { headline: 'I build for the web,', accent: 'and for search.' },
	'/work/': { headline: 'Work and', accent: 'projects' },
	'/contact/': { headline: "Let's", accent: 'talk.' },
	'/services/': { headline: 'Services' },
	'/services/web-development/': { headline: 'Website Development Services', accent: 'in Kerala' },
	'/services/seo/': { headline: 'SEO Services', accent: 'in Kerala' },
	'/services/python-django-development/': { headline: 'Python Django Developer', accent: 'in Kerala' },
};

export type OgEntry = OgContent & {
	/** File name under /og/, without .png */
	name: string;
	/** Page path the image belongs to (undefined for the default image) */
	path?: string;
};

/** "/" → "home", "/services/seo/" → "services-seo" */
const nameFor = (path: string) => (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replaceAll('/', '-'));

export async function getOgEntries(): Promise<OgEntry[]> {
	const projects = await getCollection('projects');
	return [
		{ name: 'default', headline: 'Jibin Johnson', isDefault: true },
		...Object.entries(PAGES).map(([path, content]) => ({ name: nameFor(path), path, ...content })),
		...projects.map((project) => ({
			name: nameFor(`/work/${project.id}/`),
			path: `/work/${project.id}/`,
			headline: project.data.title,
			accent: project.data.subtitle,
		})),
	];
}

/** The OG image URL and alt text for a page path. */
export async function ogImageFor(path: string): Promise<{ src: string; alt: string }> {
	const entry = (await getOgEntries()).find((e) => e.path === path);
	if (!entry) return { src: '/og/default.png', alt: 'Jibin Johnson, Web Developer and SEO Specialist in Kerala' };
	const text = entry.accent ? `${entry.headline} ${entry.accent}` : entry.headline;
	return { src: `/og/${entry.name}.png`, alt: `${text} | Jibin Johnson` };
}
