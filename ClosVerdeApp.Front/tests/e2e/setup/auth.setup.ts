import { expect, type Page, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { playwrightPrivateEnv, requirePrivateEnvValue } from "../config/load-private-env";

async function findVisibleLocator(page: Page, selectors: string[]) {
	for (const selector of selectors) {
		try {
			return await page.waitForSelector(selector, { state: "visible", timeout: 5_000 });
		} catch {
			continue;
		}
	}

	throw new Error(`Impossible de trouver un sélecteur visible parmi : ${selectors.join(", ")}`);
}

test("capture l'authentification Keycloak", async ({ page }) => {
	const login = requirePrivateEnvValue("PLAYWRIGHT_KEYCLOAK_LOGIN");
	const password = requirePrivateEnvValue("PLAYWRIGHT_KEYCLOAK_PASSWORD");

	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Bienvenue." })).toBeVisible();
	await page.getByRole("button", { name: "Se connecter" }).click();

	await (await findVisibleLocator(page, ["#username", 'input[name="username"]', 'input[name="email"]'])).fill(login);
	await (await findVisibleLocator(page, ["#password", 'input[name="password"]'])).fill(password);
	await (await findVisibleLocator(page, ["#kc-login", 'button[type="submit"]', 'button:has-text("Se connecter")', 'button:has-text("Sign in")'])).click();

	await page.waitForURL(/\/calendrier(?:$|[?#])/, { timeout: 120_000 });
	await page.waitForFunction(() => Object.keys(window.localStorage).some((key) => key.startsWith("oidc.user:")));

	mkdirSync(dirname(playwrightPrivateEnv.storageStatePath), { recursive: true });
	await page.context().storageState({ path: playwrightPrivateEnv.storageStatePath });
});
