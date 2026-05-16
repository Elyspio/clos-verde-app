import { expect, test } from "@playwright/test";
import { ensureAuthenticatedStorageState } from "../../helpers/api-client.helpers";
import { seedAuthenticatedSession } from "../../helpers/auth-session.helpers";

test.describe("Auth guard public", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("affiche la page de connexion", async ({ page }) => {
		await page.goto("/login");

		await expect(page.getByRole("button", { name: "Se connecter" }).or(page.getByRole("button", { name: "Connexion" }))).toBeVisible();
	});

	test("affiche une page dédiée quand la session ne peut plus être renouvelée", async ({ page }) => {
		await seedAuthenticatedSession(page, {
			sub: "22222222-2222-2222-2222-222222222222",
			email: "playwright-expired@example.test",
			name: "Playwright Expired",
			preferred_username: "playwright-expired",
		});

		await page.goto("/session-expiree");

		await expect(page.getByRole("heading", { name: "Session expirée." })).toBeVisible();
		await expect(page.getByText("La session locale a été fermée")).toBeVisible();
		await expect(page.getByRole("button", { name: "Se reconnecter" })).toBeVisible();
		await expect(
			page.evaluate(() => ({
				appToken: window.localStorage.getItem("clos-verde-app.token"),
				oidcUsers: Object.keys(window.localStorage).filter((key) => key.startsWith("oidc.user:")),
			})),
		).resolves.toEqual({ appToken: null, oidcUsers: [] });
	});

	test("signale clairement quand l'utilisateur E2E demandé n'existe pas", () => {
		expect(() => ensureAuthenticatedStorageState("missing-user")).toThrow("Utilisateur E2E inconnu");
	});
});
