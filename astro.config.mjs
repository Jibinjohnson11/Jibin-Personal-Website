// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://jibinjohnson.in',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/styleguide/'),
    }),
  ],
});
