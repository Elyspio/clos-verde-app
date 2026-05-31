import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { addAdminReplyViaApi, seedFeedback } from "../../helpers/feedback-data.helpers";

test.describe("Admin — fil d'échanges sur un avis", () => {
	test.describe("côté admin", () => {
		test.use({ defaultUser: "admin" });

		test("répond à un ticket et voit la réponse dans le fil", async ({ apiClientFor, page }) => {
			const runId = createRunId();
			const alice = await apiClientFor("alice");
			const created = await seedFeedback(alice, { category: "Question", title: `E2E reply admin ${runId}`, body: `Question ${runId}.` });
			const replyText = `Réponse admin ${runId}`;

			await page.goto("/admin/feedback");
			await page.getByTestId(`admin-feedback-row-${created.id}`).click();
			const detail = page.getByTestId("admin-feedback-detail");
			await expect(detail).toContainText(`E2E reply admin ${runId}`);

			await page.getByTestId("admin-feedback-reply").locator("textarea").first().fill(replyText);
			const replyPromise = page.waitForResponse(
				(response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/feedback/${created.id}/replies` && response.status() === 200,
			);
			await page.getByTestId("admin-feedback-reply-send").click();
			await replyPromise;

			await expect(detail).toContainText(replyText);
		});
	});

	test.describe("côté auteur", () => {
		test.use({ defaultUser: "alice" });

		test("voit la réponse de l'équipe dans « Mes tickets »", async ({ apiClient, apiClientFor, page }) => {
			const runId = createRunId();
			// Alice (default user) authors the ticket; the admin answers via API.
			const created = await seedFeedback(apiClient, { category: "Question", title: `E2E reply author ${runId}`, body: `Question ${runId}.` });
			const replyText = `Bonjour, voici notre réponse ${runId}`;
			const admin = await apiClientFor("admin");
			await addAdminReplyViaApi(admin, created.id, replyText);

			await page.goto("/mes-tickets");
			await expect(page.getByTestId("my-feedback-page")).toBeVisible();
			await page.getByTestId(`my-feedback-row-${created.id}`).click();

			const drawer = page.getByTestId("my-feedback-drawer");
			await expect(drawer).toBeVisible();
			const replies = drawer.getByTestId("my-feedback-replies");
			await expect(replies).toBeVisible();
			await expect(replies).toContainText(replyText);
		});
	});
});
