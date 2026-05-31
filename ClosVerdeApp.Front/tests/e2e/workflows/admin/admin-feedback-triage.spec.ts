import { Buffer } from "node:buffer";
import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { seedFeedback } from "../../helpers/feedback-data.helpers";
import { uploadAttachmentViaApi } from "../../helpers/messaging-data.helpers";

const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

test.describe("Admin — triage des avis (master-detail)", () => {
	test.use({ defaultUser: "admin" });

	test("liste, recherche, détail avec pièce jointe, puis cycle de statut", async ({ apiClientFor, page }) => {
		const runId = createRunId();
		const title = `E2E triage ${runId}`;

		// Seed an open Bug (with an attachment owned by its author) so the detail can show it.
		const camille = await apiClientFor("camille");
		const fileName = `triage-${runId}.png`;
		const attachment = await uploadAttachmentViaApi(camille, { name: fileName, mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64") });
		const created = await seedFeedback(camille, { category: "Bug", title, body: `Corps ${runId}.`, attachmentIds: [attachment.id] });

		await page.goto("/admin/feedback");
		await expect(page.getByTestId("admin-feedback-page")).toBeVisible();

		const row = page.getByTestId(`admin-feedback-row-${created.id}`);
		await expect(row).toBeVisible();

		// Client-side search keeps the matching row.
		await page.getByTestId("admin-feedback-search").locator("input").fill(title);
		await expect(row).toBeVisible();
		await page.getByTestId("admin-feedback-search").locator("input").fill("");

		// Select → detail shows title, category and the attachment.
		await row.click();
		const detail = page.getByTestId("admin-feedback-detail");
		await expect(detail).toContainText(title);
		await expect(detail).toContainText("Bug");
		await expect(detail.getByText(fileName)).toBeVisible();

		// Mark resolved → it leaves the "Ouverts" tab.
		const resolvePromise = page.waitForResponse(
			(response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/feedback/${created.id}/status` && response.status() === 200,
		);
		await detail.getByRole("button", { name: "Marquer résolu" }).click();
		await resolvePromise;
		await expect(page.getByTestId(`admin-feedback-row-${created.id}`)).toHaveCount(0);

		// It reappears under the "Résolus" tab.
		await page.getByTestId("admin-feedback-tab-Resolved").click();
		await expect(page.getByTestId(`admin-feedback-row-${created.id}`)).toBeVisible();

		// Re-open from the detail → PATCH back to Open.
		await page.getByTestId(`admin-feedback-row-${created.id}`).click();
		const reopenPromise = page.waitForResponse(
			(response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/feedback/${created.id}/status` && response.status() === 200,
		);
		await detail.getByRole("button", { name: "Ré-ouvrir" }).click();
		await reopenPromise;
	});
});
