import { test as base, type APIRequestContext } from "@playwright/test";
import { createAuthenticatedApiClient, ensureAuthenticatedStorageState } from "./api-client.helpers";

type AuthenticatedFixtures = {
	ensureStorageState: void;
	apiClient: APIRequestContext;
};

export const test = base.extend<AuthenticatedFixtures>({
	ensureStorageState: [
		async ({ browserName: _browserName }, use: () => Promise<void>) => {
			ensureAuthenticatedStorageState();
			await use();
		},
		{ auto: true },
	],
	apiClient: async ({ browserName: _browserName }, use) => {
		const apiClient = await createAuthenticatedApiClient();
		try {
			await use(apiClient);
		} finally {
			await apiClient.dispose();
		}
	},
});

export { expect } from "@playwright/test";
