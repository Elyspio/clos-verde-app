import type { Page } from "@playwright/test";
import { getOidcAuthorityCandidates, getOidcStorageKey } from "./e2e-users.helpers";

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
	const oidcStorageEntries = getOidcAuthorityCandidates().map((authority) => ({
		key: getOidcStorageKey(authority),
		value: createOidcStorageValue(user),
	}));
	const accessToken = user.access_token ?? "playwright-access-token";

	await page.addInitScript(
		({ entries, token }) => {
			for (const entry of entries) {
				window.localStorage.setItem(entry.key, entry.value);
			}
			window.localStorage.setItem("clos-verde-app.token", token);
		},
		{ entries: oidcStorageEntries, token: accessToken },
	);
}
