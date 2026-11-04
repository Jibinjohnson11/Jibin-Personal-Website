import type { ImageMetadata } from 'astro';
import prceptionVisual from '../assets/brand/prception/prception-visual.png';
import floatingCityHero from '../assets/images/work/floatingcity-hero.webp';

/** One card on /work/. `href` is left out until the project has a case study page. */
export interface WorkCard {
	title: string;
	subtitle: string;
	href?: string;
	cover?: ImageMetadata;
	coverAlt?: string;
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
		cover: floatingCityHero,
		coverAlt: 'FloatingCity homepage for Muziris, City at Sea: a large ship crossing the ocean at sunset, with figures for residences, decks, capacity and retail space',
		coverPosition: '30% center',
	},
	{
		title: 'Prception',
		subtitle: 'SEO work',
		cover: prceptionVisual,
		coverAlt: 'Prception Medialab brand visual: the white P logo on a glowing teal glass disc',
		coverPosition: '75% center',
	},
];
