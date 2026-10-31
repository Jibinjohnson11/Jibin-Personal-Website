import { getImage } from 'astro:assets';
import portrait from '../assets/images/jibin-johnson.jpg';
import { SITE, SOCIAL } from '../data/site';

/** Stable @id so other schema on the site can point at the same Person. */
export const PERSON_ID = `${SITE.url}/#person`;

/**
 * The Person schema used on every page that describes Jibin (home, about, contact).
 * Defined once here so the pages never drift apart. No @context: callers add it when
 * the Person is the top-level node, or nest it as-is (e.g. ProfilePage.mainEntity).
 */
export async function getPerson() {
	const image = await getImage({ src: portrait, width: 800, format: 'jpg' });

	return {
		'@type': 'Person',
		'@id': PERSON_ID,
		name: SITE.name,
		jobTitle: 'Web Developer and SEO Specialist',
		url: `${SITE.url}/`,
		image: new URL(image.src, SITE.url).href,
		email: `mailto:${SITE.email}`,
		worksFor: { '@type': 'Organization', name: 'Prception Medialab' },
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Thiruvananthapuram',
			addressRegion: 'Kerala',
			addressCountry: 'IN',
		},
		sameAs: SOCIAL.map((link) => link.url),
		knowsAbout: [
			'Web development',
			'Search engine optimization',
			'Technical SEO',
			'HTML',
			'CSS',
			'JavaScript',
			'Python',
			'Django',
			'PostgreSQL',
			'Google Search Console',
			'Google Analytics',
		],
	};
}
