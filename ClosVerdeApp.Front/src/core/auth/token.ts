let accessToken: string | null = null;

export function getAccessToken(): string | null {
	if (accessToken) return accessToken;

	accessToken = readStoredAccessToken();
	return accessToken;
}

export function setAccessToken(token: string | null): void {
	accessToken = token;
}

function readStoredAccessToken(): string | null {
	if (typeof window === "undefined") return null;

	const appToken = window.sessionStorage.getItem("clos-verde-app.token") ?? window.localStorage.getItem("clos-verde-app.token");
	if (appToken) return appToken;

	const oidcToken = readOidcAccessToken(window.localStorage) ?? readOidcAccessToken(window.sessionStorage);
	return oidcToken;
}

function readOidcAccessToken(storage: Storage): string | null {
	for (let i = 0; i < storage.length; i += 1) {
		const key = storage.key(i);
		if (!key?.startsWith("oidc.user:")) continue;

		const value = storage.getItem(key);
		if (!value) continue;

		try {
			const user = JSON.parse(value) as { access_token?: unknown; expired?: unknown };
			if (user.expired === true || typeof user.access_token !== "string" || user.access_token.length === 0) continue;
			return user.access_token;
		} catch {
			continue;
		}
	}

	return null;
}
