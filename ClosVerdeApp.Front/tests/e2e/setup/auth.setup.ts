import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { playwrightPrivateEnv } from "../config/load-private-env";
import { createStorageState, e2eUsers, getOidcAuthorityCandidates, type E2eUser } from "../helpers/e2e-users.helpers";

type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	id_token?: string;
	token_type?: string;
	scope?: string;
	expires_in?: number;
};

async function requestToken(request: APIRequestContext, user: E2eUser): Promise<TokenResponse> {
	const attempts: string[] = [];

	for (const authority of getOidcAuthorityCandidates()) {
		const tokenEndpoint = `${authority}/protocol/openid-connect/token`;
		try {
			const response = await request.post(tokenEndpoint, {
				form: {
					grant_type: "password",
					client_id: playwrightPrivateEnv.keycloakClientId,
					username: user.username,
					password: user.password,
					scope: "openid profile email",
				},
			});

			if (response.ok()) {
				const token = (await response.json()) as Partial<TokenResponse>;
				if (typeof token.access_token !== "string" || token.access_token.length === 0) {
					throw new Error(`Réponse token invalide pour ${user.username} depuis ${tokenEndpoint}.`);
				}

				return token as TokenResponse;
			}

			attempts.push(`${tokenEndpoint} -> ${response.status()} ${await response.text()}`);
		} catch (error) {
			attempts.push(`${tokenEndpoint} -> ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	throw new Error(`Impossible de récupérer un token Keycloak pour ${user.username}: ${attempts.join(" | ")}`);
}

test("capture les authentifications Keycloak locales", async ({ request }) => {
	expect(e2eUsers.length, "Le realm local doit exposer des utilisateurs E2E.").toBeGreaterThan(0);

	for (const user of e2eUsers) {
		const token = await requestToken(request, user);
		const storageState = createStorageState(user, token);

		mkdirSync(dirname(user.storageStatePath), { recursive: true });
		writeFileSync(user.storageStatePath, JSON.stringify(storageState, null, "\t"), "utf8");
	}
});
