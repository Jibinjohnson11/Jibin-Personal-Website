/**
 * Screen-height helpers for scroll scenes that pin or size things to the viewport.
 *
 * On phones and tablets the browser toolbar slides in and out while you scroll, and every
 * step of that slide fires a window resize with a new innerHeight. Anything measured from
 * innerHeight (a sticky offset, a "does this card fit" check) then changes mid-scroll, and
 * the pinned content jumps or the layout is rebuilt under your finger. These two helpers
 * give a height that stays put and a resize hook that ignores toolbar-only changes.
 *
 * Desktop (fine pointer) behaves exactly as before: innerHeight, and every resize.
 */
const touch = window.matchMedia('(hover: none), (pointer: coarse)');

let probe: HTMLElement | null = null;

/**
 * Viewport height in px. On touch screens this is the small viewport (100svh: the screen
 * with the toolbars showing), which never changes as they slide. Reading it can lay out,
 * so call it when measuring, not every frame.
 */
export function viewportHeight(): number {
	if (!touch.matches || !CSS.supports('height', '100svh')) return window.innerHeight;
	if (!probe) {
		probe = document.createElement('div');
		probe.setAttribute('aria-hidden', 'true');
		probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
		document.body.append(probe);
	}
	return probe.offsetHeight;
}

/**
 * Run `fn` on window resizes that change the layout: every resize on desktop, but on touch
 * screens only when the width changes (rotation, split view), never for the toolbar.
 */
export function onLayoutResize(fn: () => void) {
	let width = window.innerWidth;
	window.addEventListener(
		'resize',
		() => {
			if (touch.matches && window.innerWidth === width) return;
			width = window.innerWidth;
			fn();
		},
		{ passive: true },
	);
}
