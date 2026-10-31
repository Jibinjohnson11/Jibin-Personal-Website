// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import sitemap from '@astrojs/sitemap';
import csp from './integrations/csp.mjs';

// .env values aren't in process.env at config time; load them to know if analytics is on.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
	site: 'https://jibinjohnson.in',
	trailingSlash: 'always',
	integrations: [
		sitemap({
			filter: (page) => !page.includes('/styleguide/'),
		}),
		csp({ analytics: Boolean(env.PUBLIC_GA_ID) }),
	],
});
