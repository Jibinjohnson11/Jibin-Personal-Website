interface ImportMetaEnv {
	/** Web3Forms access key for the contact form (public by design). */
	readonly PUBLIC_WEB3FORMS_KEY?: string;
	/** Google Analytics 4 measurement ID, e.g. G-XXXXXXXXXX. Empty = no analytics. */
	readonly PUBLIC_GA_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
