/**
 * Site-wide motion: Lenis smooth scroll and reveal-on-scroll.
 *
 * Hidden "before reveal" styles only apply while <html> has .js-reveal, which the inline
 * script in BaseLayout adds (and removes again if this file never runs). Reduced-motion
 * users never get .js-reveal, so everything is visible and static for them.
 */
import 'lenis/dist/lenis.css';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const touch = window.matchMedia('(hover: none), (pointer: coarse)');

root.classList.add('motion-ready');

/* --- Smooth scroll ------------------------------------------------------ */

// Loaded on demand so the reveal code below isn't waiting on it.
if (!reduceMotion.matches && !touch.matches) {
	import('lenis').then(({ default: Lenis }) => {
		const lenis = new Lenis({ lerp: 0.1, autoRaf: true });
		// Shared so other scripts (the back-to-top button) can scroll through Lenis.
		(window as Window & { siteLenis?: typeof lenis }).siteLenis = lenis;

		// Freeze the page while the mobile menu overlay (html.menu-open) or the preloader
		// (html.is-preloading) is showing.
		const isLocked = () => root.classList.contains('menu-open') || root.classList.contains('is-preloading');
		let locked = false;
		const sync = () => {
			if (isLocked() === locked) return;
			locked = !locked;
			if (locked) lenis.stop();
			else lenis.start();
		};
		new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
		sync();
	});
}

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
	let line = -1;
	let lineTop = -Infinity;
	for (const word of words) {
		const top = word.getBoundingClientRect().top;
		if (top > lineTop + 2) {
			line += 1;
			lineTop = top;
		}
		word.style.setProperty('--line', String(line));
	}
}

if (root.classList.contains('js-reveal')) {
	const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

	targets.forEach((el) => {
		if (el.dataset.reveal !== 'lines') return;
		assignLines(splitWords(el));
		el.classList.add('is-split');
	});

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.classList.add('is-revealed');
				observer.unobserve(entry.target);
			}
		},
		{ rootMargin: '0px 0px -8% 0px' },
	);

	// Hold the reveals until the preloader starts to lift, so they play where you can see them.
	const observeAll = () => targets.forEach((el) => observer.observe(el));
	if (root.classList.contains('is-preloading')) document.addEventListener('preloader:done', observeAll, { once: true });
	else observeAll();
}
