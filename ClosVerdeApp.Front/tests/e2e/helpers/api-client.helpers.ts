import { existsSync, readFileSync } from "node:fs";
import { request, type APIRequestContext } from "@playwright/test";
import { playwrightPrivateEnv } from "../config/load-private-env";
import { ensureUserStorageState, resolveE2eUser, type E2eUserRef } from "./e2e-users.helpers";

type StorageState = {
	origins?: Array<{
		origin: string;
		localStorage?: Array<{
			name: string;
			value: string;
		}>;
	}>;
};

type StoredOidcUser = {
	access_token?: unknown;
	expires_at?: unknown;
	profile?: {
		sub?: string;
		email?: string;
		name?: string;
		preferred_username?: string;
	};
};

export type AuthenticatedSessionData = {
	accessToken: string;
	expiresAt: number;
	profile: {
		sub?: string;
		email?: string;
		name?: string;
		preferred_username?: string;
	};
	storageStatePath: string;
	oidcStorageKey: string;
};

export function ensureAuthenticatedStorageState(userKey: E2eUserRef) {
	const storageStatePath = resolveE2eUser(userKey).storageStatePath;
	if (existsSync(storageStatePath)) return storageStatePath;

	return ensureUserStorageState(userKey);
}

export function readAuthenticatedSessionData(userKey: E2eUserRef): AuthenticatedSessionData {
	const resolvedStorageStatePath = ensureAuthenticatedStorageState(userKey);
	const rawStorageState = readFileSync(resolvedStorageStatePath, "utf8");
	const storageState = JSON.parse(rawStorageState) as StorageState;
	const oidcEntry = storageState.origins?.flatMap((origin) => origin.localStorage ?? []).find((entry) => entry.name.startsWith("oidc.user:"));

	if (!oidcEntry) {
		throw new Error(`Aucune session OIDC trouvée dans ${resolvedStorageStatePath}. Relancez \`pnpm e2e:auth\`.`);
	}

	const oidcUser = JSON.parse(oidcEntry.value) as StoredOidcUser;
	if (typeof oidcUser.access_token !== "string" || oidcUser.access_token.length === 0) {
		throw new Error(`Aucun access token valide trouvé dans ${resolvedStorageStatePath}. Relancez \`pnpm e2e:auth\`.`);
	}

	if (typeof oidcUser.expires_at !== "number") {
		throw new Error(`La date d'expiration OIDC est absente dans ${resolvedStorageStatePath}. Relancez \`pnpm e2e:auth\`.`);
	}

	if (oidcUser.expires_at <= Math.floor(Date.now() / 1_000)) {
		throw new Error("Le storage state Playwright a expiré. Relancez `pnpm e2e:auth`.");
	}

	return {
		accessToken: oidcUser.access_token,
		expiresAt: oidcUser.expires_at,
		profile: oidcUser.profile ?? {},
		storageStatePath: resolvedStorageStatePath,
		oidcStorageKey: oidcEntry.name,
	};
}

export async function createAuthenticatedApiClient(userKey: E2eUserRef): Promise<APIRequestContext> {
	const { accessToken } = readAuthenticatedSessionData(userKey);

	return request.newContext({
		baseURL: playwrightPrivateEnv.apiBaseUrl,
		ignoreHTTPSErrors: true,
		extraHTTPHeaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
}
