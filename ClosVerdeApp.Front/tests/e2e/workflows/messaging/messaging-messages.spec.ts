import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, createTopicViaApi, listMessages, postMessageViaApi } from "../../helpers/messaging-data.helpers";
import { tiptapEditable, typeInComposer, waitForComposerReady } from "../../helpers/tiptap.helpers";

test.describe("Messaging — messages", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("envoie un message via Tiptap puis le voit s'afficher dans la liste", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-post-${runId}`);
		createdTopicIds.push(topic.id);

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();

		const body = `salut ${runId}`;
		await typeInComposer(page, body);
		await waitForComposerReady(page);

		const postPromise = page.waitForResponse((response) => {
			if (response.request().method() !== "POST") return false;
			return new URL(response.url()).pathname === `/api/topics/${topic.id}/messages`;
		});
		await page.getByTestId("message-composer-submit").click();
		const postResponse = await postPromise;
		expect(postResponse.status(), `POST message: ${await postResponse.text()}`).toBe(201);
		const created = (await postResponse.json()) as { id: string; contentHtml: string };

		const messageRow = page.getByTestId(`message-${created.id}`);
		await expect(messageRow).toBeVisible();
		await expect(messageRow).toContainText(body);

		// Composer empties after a successful post (clearOnSubmit defaults to true).
		await expect(tiptapEditable(page)).toHaveText("");
	});

	test("modifier un message ouvre l'éditeur Tiptap (pas de TextField HTML brut) et persiste l'update", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-edit-${runId}`);
		createdTopicIds.push(topic.id);

		const original = await postMessageViaApi(apiClient, topic.id, `<p>original ${runId}</p>`);

		await page.goto(`/messages/${topic.id}`);
		const messageRow = page.getByTestId(`message-${original.id}`);
		await expect(messageRow).toBeVisible();

		await page.getByTestId(`message-actions-${original.id}`).click();
		await page.getByTestId("message-menu-edit").click();

		await expect(page.getByTestId("message-edit-banner")).toBeVisible();

		// Crucial: Tiptap editor visible with rendered text — not a textarea with raw HTML.
		const editor = tiptapEditable(page);
		await expect(editor).toBeVisible();
		await expect(editor).toContainText(`original ${runId}`);
		await expect(editor).not.toContainText("<p>");
		await expect(page.getByTestId("message-composer").locator("textarea")).toHaveCount(0);

		const updated = `modifié ${runId}`;
		await typeInComposer(page, updated);
		await waitForComposerReady(page);

		const editPromise = page.waitForResponse((response) => {
			if (response.request().method() !== "PUT") return false;
			return new URL(response.url()).pathname === `/api/messages/${original.id}`;
		});
		await page.getByTestId("message-composer-submit").click();
		const editResponse = await editPromise;
		expect(editResponse.status(), `PUT message: ${await editResponse.text()}`).toBe(200);

		await expect(page.getByTestId("message-edit-banner")).toHaveCount(0);
		await expect(messageRow).toContainText(updated);
		await expect(messageRow).toHaveAttribute("data-message-edited", "true");

		const refreshed = await listMessages(apiClient, topic.id);
		expect(refreshed.find((m) => m.id === original.id)?.contentHtml).toContain(updated);
	});

	test("supprimer un message affiche le placeholder « Message supprimé »", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-delete-${runId}`);
		createdTopicIds.push(topic.id);

		const original = await postMessageViaApi(apiClient, topic.id, `<p>à supprimer ${runId}</p>`);

		await page.goto(`/messages/${topic.id}`);
		const messageRow = page.getByTestId(`message-${original.id}`);
		await expect(messageRow).toBeVisible();

		await page.getByTestId(`message-actions-${original.id}`).click();
		const deletePromise = page.waitForResponse((response) => {
			if (response.request().method() !== "DELETE") return false;
			return new URL(response.url()).pathname === `/api/messages/${original.id}`;
		});
		await page.getByTestId("message-menu-delete").click();
		const deleteResponse = await deletePromise;
		expect(deleteResponse.status(), `DELETE message: ${await deleteResponse.text()}`).toBe(200);

		await expect(messageRow).toHaveAttribute("data-message-deleted", "true");
		await expect(messageRow).toContainText("Message supprimé");
		await expect(page.getByTestId(`message-actions-${original.id}`)).toHaveCount(0);
	});

	test("annuler une édition referme l'éditeur et restaure le composer vide", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-cancel-${runId}`);
		createdTopicIds.push(topic.id);

		const original = await postMessageViaApi(apiClient, topic.id, `<p>texte ${runId}</p>`);

		await page.goto(`/messages/${topic.id}`);
		await page.getByTestId(`message-actions-${original.id}`).click();
		await page.getByTestId("message-menu-edit").click();

		await expect(page.getByTestId("message-edit-banner")).toBeVisible();
		await expect(page.getByTestId("message-composer-cancel")).toBeVisible();

		await page.getByTestId("message-composer-cancel").click();

		await expect(page.getByTestId("message-edit-banner")).toHaveCount(0);
		await expect(page.getByTestId("message-composer-cancel")).toHaveCount(0);
		await expect(tiptapEditable(page)).toHaveText("");
	});
});
