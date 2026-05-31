import { Buffer } from "node:buffer";
import type { Page } from "@playwright/test";
import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";

// Inline fixtures — keep the binary path exercised without shipping files on disk.
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";
// Minimal but structurally valid single-page PDF.
const TINY_PDF =
	"%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

function tinyPng(): Buffer {
	return Buffer.from(TINY_PNG_BASE64, "base64");
}

const CATEGORIES = [
	{ category: "Bug", testid: "feedback-category-bug" },
	{ category: "Suggestion", testid: "feedback-category-suggestion" },
	{ category: "Question", testid: "feedback-category-question" },
	{ category: "Other", testid: "feedback-category-other" },
] as const;

async function openFeedbackForm(page: Page, categoryTestId: string) {
	await page.goto("/calendrier");
	await expect(page.getByTestId("app-shell")).toBeVisible();
	await page.getByTestId("feedback-trigger").click();
	await expect(page.getByTestId("feedback-dialog")).toBeVisible();
	await page.getByTestId(categoryTestId).click();
	await expect(page.getByTestId("feedback-form")).toBeVisible();
}

async function fillTitleAndBody(page: Page, title: string, body: string) {
	await page.getByTestId("feedback-title").locator("input").fill(title);
	await page.getByTestId("feedback-body").locator("textarea").first().fill(body);
}

async function submitAndReadCreated(page: Page): Promise<{ id: string; category: string; attachments: unknown[] }> {
	const postPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/feedback");
	await page.getByTestId("feedback-submit").click();
	const response = await postPromise;
	expect(response.status(), `POST /api/feedback: ${await response.text()}`).toBe(201);
	return (await response.json()) as { id: string; category: string; attachments: unknown[] };
}

test.describe("Feedback — création de tickets", () => {
	// Each category submits a ticket without attachment and lands on the confirmation screen.
	for (const { category, testid } of CATEGORIES) {
		test(`crée un ticket « ${category} » sans pièce jointe`, async ({ page }) => {
			const runId = createRunId();
			await openFeedbackForm(page, testid);
			await fillTitleAndBody(page, `E2E ${category} ${runId}`, `Description ${category} pour le run ${runId}.`);

			const created = await submitAndReadCreated(page);
			expect(created.category).toBe(category);
			expect(created.attachments).toHaveLength(0);

			await expect(page.getByTestId("feedback-sent")).toBeVisible();
			await page.getByTestId("feedback-close").click();
			await expect(page.getByTestId("feedback-dialog")).toBeHidden();
		});
	}

	test("crée un ticket Bug avec une image en pièce jointe", async ({ page }) => {
		const runId = createRunId();
		await openFeedbackForm(page, "feedback-category-bug");

		const uploadPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/attachments");
		await page.getByTestId("feedback-file-input").setInputFiles({ name: `capture-${runId}.png`, mimeType: "image/png", buffer: tinyPng() });
		expect((await uploadPromise).status(), "POST /api/attachments").toBe(201);
		await expect(page.locator('[data-testid^="feedback-attachment-"][data-attachment-status="ready"]')).toBeVisible();

		await fillTitleAndBody(page, `E2E Bug image ${runId}`, `Bug avec capture ${runId}.`);
		const created = await submitAndReadCreated(page);
		expect(created.category).toBe("Bug");
		expect(created.attachments).toHaveLength(1);

		await expect(page.getByTestId("feedback-sent")).toBeVisible();
	});

	test("crée un ticket Question avec un PDF en pièce jointe", async ({ page }) => {
		const runId = createRunId();
		await openFeedbackForm(page, "feedback-category-question");

		const uploadPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/attachments");
		await page.getByTestId("feedback-file-input").setInputFiles({ name: `doc-${runId}.pdf`, mimeType: "application/pdf", buffer: Buffer.from(TINY_PDF, "binary") });
		expect((await uploadPromise).status(), "POST /api/attachments").toBe(201);
		await expect(page.locator('[data-testid^="feedback-attachment-"][data-attachment-status="ready"]')).toBeVisible();

		await fillTitleAndBody(page, `E2E Question PDF ${runId}`, `Question avec document ${runId}.`);
		const created = await submitAndReadCreated(page);
		expect(created.category).toBe("Question");
		expect(created.attachments).toHaveLength(1);

		await expect(page.getByTestId("feedback-sent")).toBeVisible();
	});

	test("retire une pièce jointe en attente puis envoie le ticket sans pièce jointe", async ({ page }) => {
		const runId = createRunId();
		await openFeedbackForm(page, "feedback-category-suggestion");

		await page.getByTestId("feedback-file-input").setInputFiles({ name: `removeme-${runId}.png`, mimeType: "image/png", buffer: tinyPng() });
		const card = page.locator('[data-testid^="feedback-attachment-"][data-attachment-status="ready"]');
		await expect(card).toBeVisible();
		const tempId = (await card.getAttribute("data-testid"))?.replace("feedback-attachment-", "") ?? "";
		expect(tempId).not.toBe("");

		await page.getByTestId(`feedback-attachment-remove-${tempId}`).click();
		await expect(page.locator('[data-testid^="feedback-attachment-"]')).toHaveCount(0);

		await fillTitleAndBody(page, `E2E Suggestion sans PJ ${runId}`, `Suggestion sans pièce jointe ${runId}.`);
		const created = await submitAndReadCreated(page);
		expect(created.attachments).toHaveLength(0);
		await expect(page.getByTestId("feedback-sent")).toBeVisible();
	});
});
