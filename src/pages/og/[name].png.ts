import type { APIRoute, GetStaticPaths } from 'astro';
import { getOgEntries, type OgEntry } from '../../data/og';
import { renderOgImage } from '../../lib/og';

/** Builds /og/[name].png for every page listed in src/data/og.ts, plus /og/default.png. */
export const getStaticPaths = (async () => {
	const entries = await getOgEntries();
	return entries.map((entry) => ({ params: { name: entry.name }, props: entry }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
	const png = await renderOgImage(props as OgEntry);
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
