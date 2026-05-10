import type { Page } from "@playwright/test";
import { playwrightPrivateEnv } from "../config/load-private-env";

export type SeededOidcUser = {
	sub: string;
	email: string;
	name: string;
	preferred_username?: string;
	access_token?: string;
	token_type?: string;
	scope?: string;
	expires_at?: number;
};

export function getOidcStorageKey(authority = playwrightPrivateEnv.keycloakAuthority, clientId = playwrightPrivateEnv.keycloakClientId) {
	return `oidc.user:${authority}:${clientId}`;
}

export function createOidcStorageValue(user: SeededOidcUser) {
	const expiresAt = user.expires_at ?? Math.floor(Date.now() / 1_000) + 60 * 60;
	const accessToken = user.access_token ?? "playwright-access-token";

	return JSON.stringify({
		id_token: "playwright-id-token",
		session_state: "playwright-session",
		access_token: accessToken,
		token_type: user.token_type ?? "Bearer",
		scope: user.scope ?? "openid profile email",
		profile: {
			sub: user.sub,
			email: user.email,
			name: user.name,
			preferred_username: user.preferred_username ?? user.email,
		},
		expires_at: expiresAt,
		expired: false,
	});
}

export async function seedAuthenticatedSession(page: Page, user: SeededOidcUser) {
	const oidcStorageKey = getOidcStorageKey();
	const oidcStorageValue = createOidcStorageValue(user);
	const accessToken = user.access_token ?? "playwright-access-token";

	await page.addInitScript(
		({ key, value, token }) => {
			window.localStorage.setItem(key, value);
			window.localStorage.setItem("clos-verde-app.token", token);
		},
		{ key: oidcStorageKey, value: oidcStorageValue, token: accessToken },
	);
}
