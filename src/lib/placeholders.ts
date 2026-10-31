/**
 * "[PLACEHOLDER]" marks content that still needs filling in. It must never reach the live
 * site: production builds drop it, dev highlights it so it's easy to spot.
 */

const PLACEHOLDER = /\[PLACEHOLDER[^\]]*\]/g;

export const showPlaceholders = import.meta.env.DEV;

export function hasPlaceholder(value?: string): boolean {
	return !!value && value.includes('[PLACEHOLDER');
}

/** True for a real http(s) URL; false for empty values and placeholders. */
export function isRealUrl(value?: string): value is string {
	return !!value && !hasPlaceholder(value) && /^https?:\/\//.test(value);
}

/** Highlight placeholders in rendered HTML (dev) or strip them, plus any paragraph left empty (production). */
export function cleanPlaceholders(html: string): string {
	if (showPlaceholders) {
		return html.replace(PLACEHOLDER, (match) => `<mark class="placeholder">${match}</mark>`);
	}
	return html
		.replace(PLACEHOLDER, '')
		.replace(/\s+<\/p>/g, '</p>')
		.replace(/<p>\s*<\/p>\n?/g, '');
}
