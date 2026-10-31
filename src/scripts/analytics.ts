/**
 * Google Analytics 4, production builds only, and only when PUBLIC_GA_ID is set.
 * Vite inlines both values at build time, so with no ID (or in dev) this file compiles
 * to nothing. gtag.js is fetched after the page has fully loaded so it can't slow it down.
 */
declare global {
	interface Window {
		dataLayer: unknown[];
	}
}

const id = import.meta.env.PUBLIC_GA_ID;

if (import.meta.env.PROD && id) {
	const start = () => {
		window.dataLayer = window.dataLayer || [];
		// gtag expects the `arguments` object itself, not an array.
		function gtag(..._args: unknown[]) {
			// eslint-disable-next-line prefer-rest-params
			window.dataLayer.push(arguments);
		}
		gtag('js', new Date());
		gtag('config', id);

		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
		document.head.append(script);
	};

	if (document.readyState === 'complete') start();
	else window.addEventListener('load', start, { once: true });
}

export {};
