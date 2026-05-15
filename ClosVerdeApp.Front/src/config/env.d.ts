interface ImportMetaEnv {
	readonly BASE_URL: string;
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_KEYCLOAK_AUTHORITY?: string;
	readonly VITE_KEYCLOAK_CLIENT_ID?: string;
	readonly PROD?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
