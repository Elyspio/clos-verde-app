import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";

test.describe("Feedback — submit flow", () => {
	test("affiche un ticket dans Mes tickets puis permet de le clore", async ({ page }) => {
		const runId = createRunId();
		const title = `E2E ticket mes tickets ${runId}`;
		const body = `Description longue pour vérifier le détail du ticket ${runId}.`;

		await page.goto("/calendrier");
		await expect(page.getByTestId("app-shell")).toBeVisible();

		await page.getByTestId("feedback-trigger").click();
		await page.getByTestId("feedback-category-bug").click();
		await page.getByTestId("feedback-title").locator("input").fill(title);
		await page.getByTestId("feedback-body").locator("textarea").first().fill(body);

		// Capture the created ticket id so we can target the precise row + drawer instead of
		// relying on text matching (the title is rendered in both the list row and the drawer
		// header once the drawer opens, which trips Playwright's strict mode).
		const postPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/feedback");
		await page.getByTestId("feedback-submit").click();
		const postResponse = await postPromise;
		expect(postResponse.status(), `POST feedback: ${await postResponse.text()}`).toBe(201);
		const created = (await postResponse.json()) as { id: string };
		await page.getByTestId("feedback-close").click();

		// Nav has two render trees (desktop pill bar + mobile swipe bar) — both contain the
		// link, so scope to the visible main-navigation to avoid a strict-mode collision.
		await page.getByTestId("main-navigation").getByRole("link", { name: "Mes tickets" }).click();
		await expect(page).toHaveURL(/\/mes-tickets$/);
		await expect(page.getByTestId("my-feedback-page")).toBeVisible();

		const row = page.getByTestId(`my-feedback-row-${created.id}`);
		await expect(row).toBeVisible();
		await expect(row).toContainText(title);

		await row.click();
		const drawer = page.getByTestId("my-feedback-drawer");
		await expect(drawer).toBeVisible();
		await expect(drawer).toContainText(title);
		await expect(drawer).toContainText(body);

		const closePromise = page.waitForResponse(
			(response) => response.request().method() === "PATCH" && /\/api\/feedback\/me\/[^/]+\/close$/.test(new URL(response.url()).pathname),
		);
		await drawer.getByTestId("my-feedback-close-ticket").click();
		const closeResponse = await closePromise;
		expect(closeResponse.status(), `PATCH feedback close: ${await closeResponse.text()}`).toBe(200);

		await drawer.getByLabel("Fermer").click();
		// The row leaves the "En cours" tab once the list refetches after the close mutation.
		await expect(row).toBeHidden();

		await page.getByRole("tab", { name: "Historique" }).click();
		const historyRow = page.getByTestId(`my-feedback-row-${created.id}`);
		await expect(historyRow).toBeVisible();
		await expect(historyRow).toContainText(title);
	});

	test("ouvre le dialog, choisit Bug, envoie un retour et voit la confirmation", async ({ page }) => {
		const runId = createRunId();
		await page.goto("/calendrier");
		await expect(page.getByTestId("app-shell")).toBeVisible();

		await page.getByTestId("feedback-trigger").click();
		await expect(page.getByTestId("feedback-dialog")).toBeVisible();
		await expect(page.getByTestId("feedback-picker")).toBeVisible();

		await page.getByTestId("feedback-category-bug").click();
		await expect(page.getByTestId("feedback-form")).toBeVisible();

		await page.getByTestId("feedback-title").locator("input").fill(`E2E bug ${runId}`);
		await page.getByTestId("feedback-body").locator("textarea").first().fill(`Description longue pour le run ${runId}.`);

		const postPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/feedback");
		await page.getByTestId("feedback-submit").click();
		const postResponse = await postPromise;
		expect(postResponse.status(), `POST feedback: ${await postResponse.text()}`).toBe(201);

		await expect(page.getByTestId("feedback-sent")).toBeVisible();
		await page.getByTestId("feedback-close").click();
		await expect(page.getByTestId("feedback-dialog")).toBeHidden();
	});

	test("permet de revenir au sélecteur depuis le formulaire", async ({ page }) => {
		await page.goto("/calendrier");
		await page.getByTestId("feedback-trigger").click();
		await page.getByTestId("feedback-category-suggestion").click();
		await expect(page.getByTestId("feedback-form")).toBeVisible();

		await page.getByTestId("feedback-back").click();
		await expect(page.getByTestId("feedback-picker")).toBeVisible();
	});

	test("désactive le bouton d'envoi tant que titre et description ne sont pas remplis", async ({ page }) => {
		await page.goto("/calendrier");
		await page.getByTestId("feedback-trigger").click();
		await page.getByTestId("feedback-category-question").click();
		await expect(page.getByTestId("feedback-submit")).toBeDisabled();

		await page.getByTestId("feedback-title").locator("input").fill("Une question");
		// Body still empty — submit must remain disabled.
		await expect(page.getByTestId("feedback-submit")).toBeDisabled();

		await page.getByTestId("feedback-body").locator("textarea").first().fill("Comment ça marche ?");
		await expect(page.getByTestId("feedback-submit")).toBeEnabled();
	});
});
