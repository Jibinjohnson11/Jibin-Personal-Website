import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Case studies. One Markdown file per project in src/content/projects/; the body holds the
 * case study sections as H2s. The frontmatter `slug` becomes the URL: /work/[slug]/.
 *
 * liveUrl / repoUrl are plain strings so they can hold "[PLACEHOLDER]" until the real URL
 * exists; the templates only link to values that are real http(s) URLs.
 *
 * coverLabel marks a cover that isn't real data (a demo or mockup); it's shown over the image.
 *
 * homeTags / homeSummary are shorter versions for the homepage list only; when missing it
 * falls back to stack / summary. /work/ and the case studies always use the full fields.
 */
const projects = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subtitle: z.string(),
			slug: z.string(),
			order: z.number(),
			year: z.number(),
			role: z.string(),
			type: z.string(),
			stack: z.array(z.string()),
			summary: z.string(),
			homeTags: z.array(z.string()).optional(),
			homeSummary: z.string().optional(),
			liveUrl: z.string().optional(),
			repoUrl: z.string().optional(),
			cover: image().optional(),
			/** What the cover actually shows, for its alt text. */
			coverAlt: z.string().optional(),
			/** Small label shown over the cover, e.g. "Demo preview" for sample data. */
			coverLabel: z.string().optional(),
			metaTitle: z.string().max(60),
			metaDescription: z.string().max(160),
		}),
});

export const collections = { projects };
