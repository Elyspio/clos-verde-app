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

	test("signale clairement quand le storage state réel manque", () => {
		expect(() => ensureAuthenticatedStorageState(join(e2eRootDir, "cache", ".auth", "missing-user.json"))).toThrow("pnpm e2e:auth");
	});
});
