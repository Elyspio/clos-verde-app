import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { ensureAuthenticatedStorageState } from "../../helpers/api-client.helpers";
import { seedAuthenticatedSession } from "../../helpers/auth-session.helpers";
import { e2eRootDir } from "../../config/load-private-env";

test.describe("Auth guard", () => {
	test("affiche la page de connexion", async ({ page }) => {
		await page.goto("/login");

		await expect(page.getByRole("button", { name: "Se connecter" }).or(page.getByRole("button", { name: "Connexion" }))).toBeVisible();
	});

	test("redirige / vers /calendrier avec une session simulée", async ({ page }) => {
		await seedAuthenticatedSession(page, {
			sub: "11111111-1111-1111-1111-111111111111",
			email: "playwright-auth@example.test",
			name: "Playwright Auth",
			preferred_username: "playwright-auth",
		});

		await page.route("**/api/reservations?**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/");

		await expect(page).toHaveURL(/\/calendrier$/);
		await expect(page.getByTestId("app-shell")).toBeVisible();
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

	test("signale clairement quand le storage state réel manque", () => {
		expect(() => ensureAuthenticatedStorageState(join(e2eRootDir, "cache", ".auth", "missing-user.json"))).toThrow("pnpm e2e:auth");
	});
});
