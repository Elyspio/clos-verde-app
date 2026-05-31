import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { seedFeedback } from "../../helpers/feedback-data.helpers";

test.describe("Admin — tableau de bord", () => {
	test.use({ defaultUser: "admin" });

	test("affiche les KPIs et la file « À traiter », et ouvre un ticket", async ({ apiClientFor, page }) => {
		const runId = createRunId();
		// Seed an open ticket authored by a regular co-owner so it surfaces in the admin queue.
		const camille = await apiClientFor("camille");
		const created = await seedFeedback(camille, { category: "Bug", title: `E2E dashboard ${runId}`, body: `À traiter ${runId}.` });

		await page.goto("/admin/tableau-de-bord");
		const dashboard = page.getByTestId("admin-dashboard-page");
		await expect(dashboard).toBeVisible();
		await expect(dashboard.getByText("Tickets ouverts")).toBeVisible();
		await expect(dashboard.getByText("Par catégorie")).toBeVisible();

		const openRow = page.getByTestId(`admin-dashboard-open-${created.id}`);
		await expect(openRow).toBeVisible();
		await expect(openRow).toContainText(`E2E dashboard ${runId}`);

		await openRow.click();
		await expect(page).toHaveURL(/\/admin\/feedback/);
		const detail = page.getByTestId("admin-feedback-detail");
		await expect(detail).toBeVisible();
		await expect(detail).toContainText(`E2E dashboard ${runId}`);
	});
});
