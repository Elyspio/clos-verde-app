import { expect, test } from "@playwright/test";
import { resolveE2eUser } from "../../helpers/e2e-users.helpers";

test.use({ storageState: resolveE2eUser("alice").storageStatePath });

test("redirige / vers /calendrier avec la session Alice", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/calendrier$/);
	await expect(page.getByTestId("app-shell")).toBeVisible();
});
