import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, listTopics } from "../../helpers/messaging-data.helpers";

test.describe("Messaging — topics", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("le topic Général est seedé et visible dans la sidebar", async ({ apiClient, page }) => {
		// Sanity check via API that the singleton exists.
		const topics = await listTopics(apiClient);
		const global = topics.find((t) => t.topic.kind === "Global");
		expect(global, "Le topic Général doit exister au démarrage").toBeDefined();

		await page.goto("/messages");
		await expect(page.getByTestId("messages-page")).toBeVisible();
		await expect(page.getByTestId("topic-list")).toBeVisible();

		const globalRow = page.getByTestId(`topic-row-${global!.topic.id}`);
		await expect(globalRow).toBeVisible();
		await expect(globalRow).toContainText("Général");
	});

	test("crée un salon personnalisé via la boîte de dialogue puis le supprime", async ({ page }) => {
		const runId = createRunId();
		const topicName = `e2e-salon-${runId}`;

		await page.goto("/messages");
		await page.getByTestId("new-topic-button").click();

		const dialog = page.getByRole("dialog", { name: "Nouveau salon" });
		await expect(dialog).toBeVisible();
		await dialog.getByLabel("Nom du salon").fill(topicName);

		const createPromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/topics") && response.status() === 201);
		await dialog.getByRole("button", { name: "Créer" }).click();
		const createResponse = await createPromise;
		const created = (await createResponse.json()) as { id: string; name: string };
		createdTopicIds.push(created.id);

		// Lands on the new topic.
		await expect(page).toHaveURL(new RegExp(`/messages/${created.id}$`));
		await expect(page.getByTestId("topic-view")).toHaveAttribute("data-topic-id", created.id);
		await expect(page.getByTestId("topic-title")).toContainText(topicName);

		// Owner controls visible for Custom topic creator.
		await expect(page.getByTestId("topic-rename-button")).toBeVisible();
		await expect(page.getByTestId("topic-delete-button")).toBeVisible();

		// Delete via confirm dialog.
		await page.getByTestId("topic-delete-button").click();
		const confirmDialog = page.getByRole("dialog", { name: "Supprimer le salon" });
		await expect(confirmDialog).toBeVisible();
		await expect(confirmDialog).toContainText(topicName);

		const deletePromise = page.waitForResponse(
			(response) => response.request().method() === "DELETE" && response.url().endsWith(`/api/topics/${created.id}`) && response.status() === 204,
		);
		await confirmDialog.getByRole("button", { name: "Supprimer" }).click();
		await deletePromise;

		// Drop from cleanup list since it's already gone.
		createdTopicIds.length = 0;

		// URL falls back to the messages root and the row disappears.
		await expect(page).toHaveURL(/\/messages$/);
		await expect(page.getByTestId(`topic-row-${created.id}`)).toHaveCount(0);
	});

	test("renomme un salon via la boîte de dialogue dédiée", async ({ page }) => {
		const runId = createRunId();
		const initialName = `e2e-rename-${runId}`;
		const newName = `${initialName}-bis`;

		await page.goto("/messages");
		await page.getByTestId("new-topic-button").click();
		const newDialog = page.getByRole("dialog", { name: "Nouveau salon" });
		await newDialog.getByLabel("Nom du salon").fill(initialName);
		const createPromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/topics") && response.status() === 201);
		await newDialog.getByRole("button", { name: "Créer" }).click();
		const created = (await (await createPromise).json()) as { id: string };
		createdTopicIds.push(created.id);

		await page.getByTestId("topic-rename-button").click();
		const renameDialog = page.getByRole("dialog", { name: "Renommer le salon" });
		await expect(renameDialog).toBeVisible();
		const nameField = renameDialog.getByLabel("Nom");
		await nameField.fill(newName);

		const renamePromise = page.waitForResponse(
			(response) => response.request().method() === "PUT" && response.url().endsWith(`/api/topics/${created.id}`) && response.status() === 200,
		);
		await renameDialog.getByRole("button", { name: "Enregistrer" }).click();
		await renamePromise;

		await expect(page.getByTestId("topic-title")).toContainText(newName);
		await expect(page.getByTestId(`topic-row-${created.id}`)).toContainText(newName);
	});
});
