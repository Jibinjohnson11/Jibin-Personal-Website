/**
 * Site-wide motion: Lenis smooth scroll and reveal-on-scroll.
 *
 * Hidden "before reveal" styles only apply while <html> has .js-reveal, which the inline
 * script in BaseLayout adds (and removes again if this file never runs). Reduced-motion
 * users never get .js-reveal, so everything is visible and static for them.
 */
import './smooth-scroll';

const root = document.documentElement;

root.classList.add('motion-ready');

/* --- Reveal on scroll --------------------------------------------------- */

/** Wrap each word in a span so a headline can be revealed line by line. */
function splitWords(el: HTMLElement): HTMLElement[] {
	const words: HTMLElement[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

	for (const node of textNodes) {
		const fragment = document.createDocumentFragment();
		for (const part of (node.textContent ?? '').split(/(\s+)/)) {
			if (!part) continue;
			if (/^\s+$/.test(part)) {
				fragment.append(part);
			} else {
				const word = document.createElement('span');
				word.className = 'reveal-word';
				word.textContent = part;
				fragment.append(word);
				words.push(word);
			}
		}
		node.replaceWith(fragment);
	}
	return words;
}

/** Give each word a --line index based on which rendered line it sits on. */
function assignLines(words: HTMLElement[]) {
	// Read every position first, then write, so the browser lays out once per headline.
	const tops = words.map((word) => word.getBoundingClientRect().top);
	let line = -1;
	let lineTop = -Infinity;
	words.forEach((word, i) => {
		if (tops[i] > lineTop + 2) {
			line += 1;
			lineTop = tops[i];
		}
		word.style.setProperty('--line', String(line));
	});
}

if (root.classList.contains('js-reveal')) {
	// data-reveal="hero" is CSS only (see global.css), so it isn't observed here.
	const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="hero"])'));
	const pending = new Set(targets);
	const splits: HTMLElement[][] = [];

	targets.forEach((el) => {
		if (el.dataset.reveal !== 'lines') return;
		const words = splitWords(el);
		splits.push(words);
		assignLines(words);
		el.classList.add('is-split');
	});

	// Line breaks move when the web fonts swap in, so re-count the lines for the stagger.
	document.fonts?.ready.then(() => splits.forEach(assignLines));

	const reveal = (el: Element) => {
		el.classList.add('is-revealed');
		observer.unobserve(el);
		pending.delete(el as HTMLElement);
		if (!pending.size) endObserver.disconnect();
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				// In view, or already scrolled past (a reload or link landing mid-page).
				const above = entry.rootBounds ? entry.boundingClientRect.bottom < entry.rootBounds.top : false;
				if (entry.isIntersecting || above) reveal(entry.target);
			}
		},
		{ rootMargin: '0px 0px -8% 0px' },
	);

	// The -8% margin above means something in the last sliver of the page could never cross
	// the line. Once the end of the page is on screen, reveal whatever is still waiting there.
	const sentinel = document.createElement('div');
	sentinel.setAttribute('aria-hidden', 'true');
	sentinel.style.cssText = 'height:1px;margin-top:-1px;pointer-events:none';
	document.body.append(sentinel);
	const endObserver = new IntersectionObserver(([entry]) => {
		if (!entry.isIntersecting) return;
		const bottom = window.innerHeight;
		for (const el of [...pending]) if (el.getBoundingClientRect().top < bottom) reveal(el);
	});

	targets.forEach((el) => observer.observe(el));
	endObserver.observe(sentinel);
}
