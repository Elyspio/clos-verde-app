import { readAuthenticatedSessionData } from "../../helpers/api-client.helpers";
import { expect, test } from "../../helpers/authenticated-test";

test("navigue dans l'application authentifiée", async ({ page }) => {
	const { profile } = readAuthenticatedSessionData("alice");
	const accountName = profile.name ?? profile.preferred_username ?? profile.email ?? "Compte";

	await page.goto("/");

	await expect(page).toHaveURL(/\/calendrier$/);
	await expect(page.getByTestId("app-shell")).toBeVisible();
	await expect(page.getByTestId("main-navigation")).toBeVisible();
	// The sidebar groups Calendrier and Messages; Réserver is now a calendar action and Classement a tab.
	await expect(page.getByTestId("main-navigation").getByRole("link", { name: "Calendrier" })).toBeVisible();
	await expect(page.getByTestId("main-navigation").getByRole("link", { name: "Messages" })).toBeVisible();
	await expect(page.getByTestId("reserve-day")).toBeVisible();
	await expect(page.locator('button[aria-label="Menu du compte"]')).toContainText(accountName);

	// Classement is reachable through the calendar's tab switch.
	await page.getByRole("button", { name: "Classement" }).click();
	await expect(page.getByTestId("leaderboard-list")).toBeVisible();
});
