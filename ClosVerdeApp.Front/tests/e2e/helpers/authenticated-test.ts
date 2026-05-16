import { test as base, type APIRequestContext } from "@playwright/test";
import { createAuthenticatedApiClient, ensureAuthenticatedStorageState } from "./api-client.helpers";
import { resolveE2eUser, type E2eUserKey, type E2eUserRef } from "./e2e-users.helpers";

type AuthenticatedFixtures = {
	ensureStorageState: void;
	apiClient: APIRequestContext;
	apiClientFor: (userKey: E2eUserRef) => Promise<APIRequestContext>;
	storageStateFor: (userKey: E2eUserRef) => string;
	defaultUser: E2eUserKey;
};

export const test = base.extend<AuthenticatedFixtures>({
	defaultUser: ["alice", { option: true }],
	storageState: async ({ defaultUser }, use) => {
		await use(ensureAuthenticatedStorageState(defaultUser));
	},
	ensureStorageState: [
		async ({ defaultUser }, use: () => Promise<void>) => {
			ensureAuthenticatedStorageState(defaultUser);
			await use();
		},
		{ auto: true },
	],
	apiClient: async ({ defaultUser }, use) => {
		const apiClient = await createAuthenticatedApiClient(defaultUser);
		try {
			await use(apiClient);
		} finally {
			await apiClient.dispose();
		}
	},
	apiClientFor: async ({ browserName: _browserName }, use) => {
		const clients: APIRequestContext[] = [];
		try {
			await use(async (userKey) => {
				const client = await createAuthenticatedApiClient(userKey);
				clients.push(client);
				return client;
			});
		} finally {
			for (const client of clients) {
				await client.dispose();
			}
		}
	},
	storageStateFor: async ({ browserName: _browserName }, use) => {
		await use((userKey) => {
			ensureAuthenticatedStorageState(userKey);
			return resolveE2eUser(userKey).storageStatePath;
		});
	},
});

export { expect } from "@playwright/test";
