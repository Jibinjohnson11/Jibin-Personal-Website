import type { ImageMetadata } from 'astro';
import prceptionVisual from '../assets/brand/prception/prception-visual.png';

/** One card on /work/. `href` is left out until the project has a case study page. */
export interface WorkCard {
	title: string;
	subtitle: string;
	summary: string;
	stack: string[];
	href?: string;
	cover?: ImageMetadata;
	coverAlt?: string;
	coverLabel?: string;
	/** CSS object-position for the cover crop. */
	coverPosition?: string;
}

/**
 * Projects shown on /work/ only. They aren't in the projects collection yet because they have no
 * case study; once one is written, move the project into src/content/projects/ instead.
 */
export const extraWork: WorkCard[] = [
	{
		title: 'FloatingCity',
		subtitle: 'Website development',
		summary: 'A website development project for FloatingCity, showcasing its website and digital presence.',
		stack: ['HTML', 'CSS', 'JavaScript'],
		// [PLACEHOLDER] add a real FloatingCity screenshot to src/assets/images/work/ and import it here.
	},
	{
		title: 'Prception',
		subtitle: 'SEO work',
		summary: 'End-to-end SEO work including keyword research, on-page optimization and link building.',
		stack: ['Keyword research', 'On-page SEO', 'Link building'],
		cover: prceptionVisual,
		coverAlt: 'Prception Medialab brand visual: the white P logo on a glowing teal glass disc',
		coverPosition: '75% center',
	},
];
