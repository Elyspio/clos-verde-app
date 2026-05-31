import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { e2eRootDir, playwrightPrivateEnv } from "../config/load-private-env";

type RealmUser = {
	id?: string;
	username?: string;
	enabled?: boolean;
	email?: string;
	firstName?: string;
	lastName?: string;
	serviceAccountClientId?: string;
	credentials?: Array<{
		type?: string;
		value?: string;
		temporary?: boolean;
	}>;
};

type Realm = {
	users?: RealmUser[];
};

export type E2eUserKey = "admin" | "user" | "alice" | "camille" | "david" | "elodie" | "francois" | "gabrielle" | "hugo" | "ines" | "julien";
export type E2eUserRef = E2eUserKey | (string & {});

export type E2eUser = {
	key: E2eUserKey;
	id: string;
	username: string;
	email: string;
	displayName: string;
	password: string;
	storageStatePath: string;
};

export type OidcUserStorageValue = {
	id_token?: string;
	session_state?: string;
	access_token: string;
	refresh_token?: string;
	token_type: string;
	scope: string;
	expires_at: number;
	expired: false;
	profile: {
		sub: string;
		email: string;
		name: string;
		preferred_username: string;
	};
};

export type E2eStorageState = {
	cookies: [];
	origins: Array<{
		origin: string;
		localStorage: Array<{
			name: string;
			value: string;
		}>;
	}>;
};

const aliasByUsername: Record<string, E2eUserKey> = {
	admin: "admin",
	user: "user",
	"alice.martin": "alice",
	"camille.dubois": "camille",
	"david.laurent": "david",
	"elodie.petit": "elodie",
	"francois.garnier": "francois",
	"gabrielle.roux": "gabrielle",
	"hugo.lefebvre": "hugo",
	"ines.mercier": "ines",
	"julien.bernard": "julien",
};

const realmPath = resolve(e2eRootDir, "..", "..", "..", "ClosVerdeApp.AppHost", "Realms", "clos-verde-realm.json");

function readRealm(): Realm {
	return JSON.parse(readFileSync(realmPath, "utf8")) as Realm;
}

function displayName(user: RealmUser): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.username || user.email || "Utilisateur";
}

function storageStatePath(username: string): string {
	return resolve(playwrightPrivateEnv.storageStateDir, `${username}.json`);
}

function loadUsers(): E2eUser[] {
	return (readRealm().users ?? [])
		.filter((user) => user.enabled !== false && !user.serviceAccountClientId && user.id && user.username && user.email)
		.map((user) => {
			const username = user.username!;
			const key = aliasByUsername[username];
			const password = user.credentials?.find((credential) => credential.type === "password")?.value;
			if (!key || !password) return null;

			return {
				key,
				id: user.id!,
				username,
				email: user.email!,
				displayName: displayName(user),
				password,
				storageStatePath: storageStatePath(username),
			};
		})
		.filter((user): user is E2eUser => user !== null);
}

export const e2eUsers = loadUsers();

export function resolveE2eUser(userKey: E2eUserRef): E2eUser {
	const user = e2eUsers.find((candidate) => candidate.key === userKey || candidate.username === userKey);
	if (user) return user;

	throw new Error(`Utilisateur E2E inconnu: ${userKey}. Utilisateurs disponibles: ${e2eUsers.map((u) => `${u.key}/${u.username}`).join(", ")}.`);
}

export function ensureUserStorageState(userKey: E2eUserRef): string {
	const user = resolveE2eUser(userKey);
	if (existsSync(user.storageStatePath)) return user.storageStatePath;

	throw new Error(`Storage state introuvable pour ${user.username}: ${user.storageStatePath}. Lancez \`pnpm e2e:auth\` depuis ClosVerdeApp.Front/tests/e2e.`);
}

export function getOidcStorageKey(authority: string, clientId = playwrightPrivateEnv.keycloakClientId) {
	return `oidc.user:${authority}:${clientId}`;
}

export function getOidcAuthorityCandidates(authority = playwrightPrivateEnv.keycloakAuthority): string[] {
	const candidates = new Set<string>([authority]);
	try {
		const url = new URL(authority);
		if (url.hostname === "localhost" && url.port === "8088") {
			url.protocol = url.protocol === "https:" ? "http:" : "https:";
			candidates.add(url.toString().replace(/\/$/, ""));
		}
	} catch {
		// Keep only the configured authority; callers will surface the failing URL.
	}

	return [...candidates].map((candidate) => candidate.replace(/\/$/, ""));
}

export function createOidcStorageValue(
	user: E2eUser,
	token: { access_token: string; refresh_token?: string; id_token?: string; token_type?: string; scope?: string; expires_in?: number },
): string {
	const expiresAt = Math.floor(Date.now() / 1_000) + (token.expires_in ?? 30 * 60);
	const value: OidcUserStorageValue = {
		id_token: token.id_token,
		refresh_token: token.refresh_token,
		access_token: token.access_token,
		token_type: token.token_type ?? "Bearer",
		scope: token.scope ?? "openid profile email",
		expires_at: expiresAt,
		expired: false,
		profile: {
			sub: user.id,
			email: user.email,
			name: user.displayName,
			preferred_username: user.username,
		},
	};

	return JSON.stringify(value);
}

export function createStorageState(
	user: E2eUser,
	token: { access_token: string; refresh_token?: string; id_token?: string; token_type?: string; scope?: string; expires_in?: number },
): E2eStorageState {
	const origin = new URL(playwrightPrivateEnv.baseUrl).origin;
	const oidcValue = createOidcStorageValue(user, token);
	const localStorage = getOidcAuthorityCandidates().map((authority) => ({
		name: getOidcStorageKey(authority),
		value: oidcValue,
	}));

	localStorage.push({ name: "clos-verde-app.token", value: token.access_token });

	return {
		cookies: [],
		origins: [
			{
				origin,
				localStorage,
			},
		],
	};
}
