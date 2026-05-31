import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, createTopicViaApi, listTopics, type Topic } from "../../helpers/messaging-data.helpers";
import { resolveE2eUser } from "../../helpers/e2e-users.helpers";

test.describe("Messaging — admin bypass on topic rename/delete", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClientFor }) => {
		// Cleanup runs as admin so leftovers created by other users still get removed.
		const adminClient = await apiClientFor("admin");
		await cleanupTopics(adminClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("admin peut renommer un salon Custom créé par un autre utilisateur", async ({ apiClient, apiClientFor }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-admin-rename-${runId}`);
		createdTopicIds.push(topic.id);

		const adminClient = await apiClientFor("admin");
		const newName = `e2e-admin-rename-${runId}-bis`;
		const response = await adminClient.put(`/api/topics/${topic.id}`, { data: { name: newName } });
		expect(response.status(), `PUT /api/topics/${topic.id}: ${await response.text()}`).toBe(200);
		const updated = (await response.json()) as Topic;
		expect(updated.name).toBe(newName);
	});

	test("admin peut supprimer un salon Custom créé par un autre utilisateur", async ({ apiClient, apiClientFor }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-admin-delete-${runId}`);

		const adminClient = await apiClientFor("admin");
		const response = await adminClient.delete(`/api/topics/${topic.id}`);
		expect(response.status(), `DELETE /api/topics/${topic.id}: ${await response.text()}`).toBe(204);

		// Confirm it really is gone — listing as alice should not surface it.
		const remaining = await listTopics(apiClient);
		expect(remaining.find((item) => item.topic.id === topic.id)).toBeUndefined();
	});

	test("un utilisateur non admin ne peut pas renommer le salon d'un autre", async ({ apiClient, apiClientFor }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-non-admin-forbid-${runId}`);
		createdTopicIds.push(topic.id);

		const camilleClient = await apiClientFor("camille");
		const response = await camilleClient.put(`/api/topics/${topic.id}`, { data: { name: `${topic.name}-hack` } });
		expect(response.status()).toBe(403);
	});

	test("admin peut renommer le salon Général (puis le restaurer)", async ({ apiClient, apiClientFor }) => {
		const topics = await listTopics(apiClient);
		const global = topics.find((item) => item.topic.kind === "Global");
		expect(global, "Le topic Général doit exister").toBeDefined();
		const originalName = global!.topic.name;

		const adminClient = await apiClientFor("admin");
		const tempName = `Général (renommé ${createRunId()})`;
		const renameResponse = await adminClient.put(`/api/topics/${global!.topic.id}`, { data: { name: tempName } });
		expect(renameResponse.status(), `PUT global: ${await renameResponse.text()}`).toBe(200);

		try {
			const renamed = (await renameResponse.json()) as Topic;
			expect(renamed.kind).toBe("Global");
			expect(renamed.name).toBe(tempName);
		} finally {
			// Restore the original name so other tests stay stable, even on assertion failure.
			const restore = await adminClient.put(`/api/topics/${global!.topic.id}`, { data: { name: originalName } });
			expect(restore.status(), `PUT global restore: ${await restore.text()}`).toBe(200);
		}
	});
});

test.describe("Messaging — admin UI affordances", () => {
	test.use({ defaultUser: "admin" });

	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		// `apiClient` here is the admin's client (matches `defaultUser`), so it can clean up
		// topics owned by Alice as well.
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("admin voit et utilise les boutons renommer/supprimer sur un salon créé par un autre utilisateur", async ({ apiClientFor, page }) => {
		const runId = createRunId();
		const aliceClient = await apiClientFor("alice");
		const topic = await createTopicViaApi(aliceClient, `e2e-admin-ui-${runId}`);
		createdTopicIds.push(topic.id);

		// Sanity: confirm the topic isn't admin's.
		const alice = resolveE2eUser("alice");
		expect(topic.createdByUserId).toBe(alice.id);

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toHaveAttribute("data-topic-id", topic.id);

		// Both moderator affordances should be visible for the admin on someone else's topic.
		await expect(page.getByTestId("topic-rename-button")).toBeVisible();
		await expect(page.getByTestId("topic-delete-button")).toBeVisible();

		// Rename through the UI.
		const newName = `${topic.name}-by-admin`;
		await page.getByTestId("topic-rename-button").click();
		const renameDialog = page.getByRole("dialog", { name: "Renommer le salon" });
		await expect(renameDialog).toBeVisible();
		await renameDialog.getByLabel("Nom").fill(newName);
		const renamePromise = page.waitForResponse(
			(response) => response.request().method() === "PUT" && response.url().endsWith(`/api/topics/${topic.id}`) && response.status() === 200,
		);
		await renameDialog.getByRole("button", { name: "Enregistrer" }).click();
		await renamePromise;
		await expect(page.getByTestId("topic-title")).toContainText(newName);

		// Delete through the UI.
		await page.getByTestId("topic-delete-button").click();
		const confirmDialog = page.getByRole("dialog", { name: "Supprimer le salon" });
		await expect(confirmDialog).toBeVisible();
		const deletePromise = page.waitForResponse(
			(response) => response.request().method() === "DELETE" && response.url().endsWith(`/api/topics/${topic.id}`) && response.status() === 204,
		);
		await confirmDialog.getByRole("button", { name: "Supprimer" }).click();
		await deletePromise;
		createdTopicIds.length = 0;

		await expect(page).toHaveURL(/\/messages$/);
		await expect(page.getByTestId(`topic-row-${topic.id}`)).toHaveCount(0);
	});
});
