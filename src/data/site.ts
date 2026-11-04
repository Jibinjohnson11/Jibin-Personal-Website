export const SITE = {
	name: 'Jibin Johnson',
	url: 'https://jibinjohnson.in',
	email: 'jibinjohnsoninfo@gmail.com',
	location: 'Thiruvananthapuram, Kerala, India',
	resume: '/resume/jibin-johnson-resume.pdf',
	// WhatsApp number in international format, digits only (91 = India).
	// The floating WhatsApp button stays hidden while this is empty.
	whatsapp: '917736208172',
	locale: 'en_IN',
};

export const SERVICES = [
	{ name: 'Web Development', url: '/services/web-development/' },
	{ name: 'SEO', url: '/services/seo/' },
	{ name: 'Python Django Development', url: '/services/python-django-development/' },
];

export const SOCIAL = [
	{ name: 'LinkedIn', url: 'https://www.linkedin.com/in/jibinjohnson/' },
	{ name: 'GitHub', url: 'https://github.com/Jibinjohnson11' },
];

/** Normalise a path so "/about" and "/about/" compare equal. */
export function withSlash(path: string): string {
	return path.endsWith('/') ? path : `${path}/`;
}
