import { readAuthenticatedSessionData } from "../../helpers/api-client.helpers";
import { expect, test } from "../../helpers/authenticated-test";

test("navigue dans l'application authentifiée", async ({ page }) => {
	const { profile } = readAuthenticatedSessionData();
	const accountName = profile.name ?? profile.preferred_username ?? profile.email ?? "Compte";

	await page.goto("/");

	await expect(page).toHaveURL(/\/calendrier$/);
	await expect(page.getByTestId("app-shell")).toBeVisible();
	await expect(page.getByTestId("main-navigation")).toBeVisible();
	await expect(page.getByRole("link", { name: "Calendrier" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Réserver" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Classement" })).toBeVisible();
	await expect(page.locator('button[aria-label="Menu du compte"]')).toContainText(accountName);

	await page.getByRole("link", { name: "Classement" }).click();
	await expect(page).toHaveURL(/\/classement$/);
});
