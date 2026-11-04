import type { ImageMetadata } from 'astro';
import blackboxPanda from '../assets/brand/blackbox/blackbox-red-panda-walking.webp';
import prceptionLogo from '../assets/brand/prception/prception-logo.png';
import prceptionVisual from '../assets/brand/prception/prception-visual.png';

/**
 * Current roles shown in the homepage "Where I work" showcase (src/components/WhereIWork.astro).
 * Facts match the About page timeline and the case studies; nothing here is invented.
 *
 * Logos live in src/assets/brand/. An entry without `logo` (and without a theme) shows a
 * monogram tile instead. The Prception logo and symbol are the original brand files.
 */
export interface Role {
	company: string;
	/** The company name broken into lines for the oversized display type */
	nameLines: string[];
	/** Shown in the placeholder tile until a real logo is added */
	monogram: string;
	logo?: ImageMetadata;
	/** Short line under the role, e.g. how the role is engaged */
	note?: string;
	role: string;
	dates: string;
	/** ISO start date for the <time> element */
	start: string;
	place?: string;
	current: boolean;
	text: string;
	tags: string[];
	link?: { href: string; label: string };
	/** Screenshot of a project from this role */
	preview?: { src: ImageMetadata; alt: string; caption: string };
	/** Brand theme for the panel. Omit for the default teal/dark look */
	theme?: 'blackbox' | 'prception';
	/** Full-bleed background visual for themed panels, used instead of a screenshot */
	mascot?: { src: ImageMetadata; alt: string };
	/** Skill tags shown on the panel */
	skills?: string[];
	/** Main call to action. Links starting with http open in a new tab */
	cta?: { href: string; label: string };
}

export const EXPERIENCE: Role[] = [
	{
		company: 'Prception Medialab',
		nameLines: ['Prception', 'Medialab'],
		monogram: 'PM',
		logo: prceptionLogo,
		role: 'Web Developer & SEO Specialist',
		dates: 'Jan 2026 – Present',
		start: '2026-01',
		place: 'Thiruvananthapuram',
		current: true,
		text: 'I build responsive websites and run SEO for clients in healthcare, education and hospitality, from keyword research and on-page fixes to tracking results in Search Console.',
		tags: ['Web development', 'On-page SEO', 'Keyword research', 'Search Console'],
		theme: 'prception',
		mascot: {
			src: prceptionVisual,
			alt: 'The Prception logo symbol on a glowing teal glass disc, circled by a light ring and reflected on a dark glossy floor',
		},
		skills: ['Web Development', 'SEO', 'Analytics'],
		cta: { href: '/work/seren-derma/', label: 'Seren Derma Case Study' },
		link: { href: '/work/', label: 'View All Work' },
	},
	{
		company: 'BlackBox Learning',
		nameLines: ['BlackBox', 'Learning'],
		monogram: 'BL',
		note: 'AI training academy · client of Prception Medialab',
		role: 'Web Developer',
		dates: 'Jan 2026 – Present',
		start: '2026-01',
		current: true,
		text: 'BlackBox Learning is an AI and technology training company focused on building industry-ready skills through practical projects, mentorship, and hands-on learning.',
		tags: ['Team leadership', 'Content planning', 'Keyword research', 'Link building'],
		link: { href: '/work/blackbox-learning/', label: 'Case study' },
		theme: 'blackbox',
		mascot: {
			src: blackboxPanda,
			alt: 'BlackBox Learning red panda mascot in an orange blazer and sunglasses, walking out of a glowing ring',
		},
		skills: ['Generative AI', 'Full Stack Development', 'Machine Learning', 'Digital Marketing'],
		cta: { href: 'https://blackboxlearning.in/', label: 'Visit BlackBox Learning' },
	},
];
