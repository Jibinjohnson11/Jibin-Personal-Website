/**
 * The one Lenis instance for the whole site.
 *
 * Desktop with a mouse or trackpad only: phones and tablets keep native scrolling (and
 * their own momentum), and reduced-motion users get plain native scrolling too. In those
 * cases `lenis` is null and every caller falls back to window.scrollTo.
 *
 * This module is imported by motion.ts (every page), ServiceCards and FloatingActions.
 * ES modules run once per page, so they all share this same instance.
 *
 * One frame loop only: Lenis is driven by requestAnimationFrame here until a page loads
 * GSAP. syncScrollTrigger() then hands Lenis to GSAP's ticker and stops the loop below,
 * so Lenis and ScrollTrigger update in the same frame.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

type Gsap = typeof import('gsap').gsap;
type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const touch = window.matchMedia('(hover: none), (pointer: coarse)');

function create(): Lenis | null {
	if (reduceMotion.matches || touch.matches) return null;

	const instance = new Lenis({
		lerp: 0.1, // fluid but quick to settle, never floaty
		wheelMultiplier: 1,
		autoRaf: false, // driven below, or by GSAP's ticker once it loads
		// Clicking a link mid-glide stops the glide, so the next page isn't fighting it.
		stopInertiaOnNavigate: true,
		// Let a long message in a textarea scroll itself instead of the page.
		prevent: (node) => node.nodeName === 'TEXTAREA',
	});

	// Freeze the page while the menu overlay (html.menu-open) or the preloader
	// (html.is-preloading) is showing. The menu itself scrolls via data-lenis-prevent.
	const isLocked = () => root.classList.contains('menu-open') || root.classList.contains('is-preloading');
	let locked = false;
	const sync = () => {
		if (isLocked() === locked) return;
		locked = !locked;
		if (locked) instance.stop();
		else instance.start();
	};
	new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
	sync();

	return instance;
}

export const lenis: Lenis | null = create();

/* --- Frame loop --------------------------------------------------------- */

let frame = 0;
const raf = (time: number) => {
	lenis!.raf(time);
	frame = requestAnimationFrame(raf);
};
if (lenis) frame = requestAnimationFrame(raf);

let synced = false;

/**
 * Keep GSAP ScrollTrigger in step with Lenis. Safe to call more than once.
 * Without Lenis (touch, reduced motion) ScrollTrigger just follows native scroll.
 */
export function syncScrollTrigger(gsap: Gsap, ScrollTrigger: ScrollTriggerType) {
	if (!lenis || synced) return;
	synced = true;

	lenis.on('scroll', ScrollTrigger.update);

	// Move Lenis onto GSAP's ticker (seconds → ms) and retire our own loop.
	cancelAnimationFrame(frame);
	frame = 0;
	gsap.ticker.add((time) => lenis.raf(time * 1000));
	// No lag smoothing: after a long frame, catch up straight away instead of easing the jump.
	gsap.ticker.lagSmoothing(0);
}
