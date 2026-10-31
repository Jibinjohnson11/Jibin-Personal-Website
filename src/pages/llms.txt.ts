import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../data/site';

/**
 * /llms.txt (https://llmstxt.org): a plain-text summary for AI search tools.
 * The Work list comes from the projects collection, so it stays in sync with /work/.
 */
export const GET: APIRoute = async () => {
	const url = (path: string) => new URL(path, SITE.url).href;
	const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);

	const text = `# ${SITE.name}

> Web developer and SEO specialist in Thiruvananthapuram (Trivandrum), Kerala, India. I build fast, responsive websites with SEO set up from launch, run SEO campaigns, and build small-to-medium custom web apps with Python, Django and PostgreSQL.

I'm a Web Developer & SEO Specialist at Prception Medialab, and I lead the SEO and web team for Blackbox Learning, an AI training academy. I have a PG in Artificial Intelligence from Edure. I work with clients across Kerala, the rest of India and abroad. Pricing is quote-based.

Email: ${SITE.email}

## Services

- [Website Development Services in Kerala](${url('/services/web-development/')}): business websites, landing pages and portfolio sites with the SEO basics built in
- [SEO Services in Kerala](${url('/services/seo/')}): technical, on-page, off-page and local SEO, with a monthly report
- [Python Django Development](${url('/services/python-django-development/')}): dashboards, admin panels and internal tools

## Work

${projects.map((p) => `- [${p.data.title}](${url(`/work/${p.id}/`)}): ${p.data.subtitle}. ${p.data.summary}`).join('\n')}

## More

- [About](${url('/about/')}): background, experience and education
- [Contact](${url('/contact/')}): contact form and email
`;

	return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
