import { setAccessToken } from "./token";

export function clearStoredAuthSession(): void {
	setAccessToken(null);

	if (typeof window === "undefined") return;

	window.localStorage.removeItem("clos-verde-app.token");
	window.sessionStorage.removeItem("clos-verde-app.token");

	clearOidcUsers(window.localStorage);
	clearOidcUsers(window.sessionStorage);
}

function clearOidcUsers(storage: Storage): void {
	const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key?.startsWith("oidc.user:") === true);

	for (const key of keys) storage.removeItem(key);
}
