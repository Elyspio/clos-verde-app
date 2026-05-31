import { expect, test } from "../../helpers/authenticated-test";

/**
 * Admin space gating: the Admin nav group + its pages are visible to admins and hidden/redirected
 * for regular co-owners. The UI gate is `useIsAdmin`; every admin route is also server-gated.
 */
test.describe("Admin — accès & visibilité de la navigation", () => {
	test.describe("en tant qu'admin", () => {
		test.use({ defaultUser: "admin" });

		test("voit les entrées Admin et accède aux pages", async ({ page }) => {
			await page.goto("/calendrier");
			const nav = page.getByTestId("main-navigation");
			await expect(nav.getByRole("link", { name: "Tableau de bord" })).toBeVisible();
			await expect(nav.getByRole("link", { name: "Avis" })).toBeVisible();

			await nav.getByRole("link", { name: "Tableau de bord" }).click();
			await expect(page).toHaveURL(/\/admin\/tableau-de-bord$/);
			await expect(page.getByTestId("admin-dashboard-page")).toBeVisible();

			await nav.getByRole("link", { name: "Avis" }).click();
			await expect(page).toHaveURL(/\/admin\/feedback$/);
			await expect(page.getByTestId("admin-feedback-page")).toBeVisible();
		});
	});

	test.describe("en tant que copropriétaire", () => {
		// defaultUser is "alice" (non-admin) by default.
		test("ne voit pas les entrées Admin", async ({ page }) => {
			await page.goto("/calendrier");
			const nav = page.getByTestId("main-navigation");
			await expect(nav.getByRole("link", { name: "Calendrier" })).toBeVisible();
			await expect(nav.getByRole("link", { name: "Tableau de bord" })).toHaveCount(0);
			await expect(nav.getByRole("link", { name: "Avis" })).toHaveCount(0);
		});

		test("est redirigé vers le calendrier sur les routes admin", async ({ page }) => {
			await page.goto("/admin/feedback");
			await expect(page).toHaveURL(/\/calendrier$/);

			await page.goto("/admin/tableau-de-bord");
			await expect(page).toHaveURL(/\/calendrier$/);
		});
	});
});
