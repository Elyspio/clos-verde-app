import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, createTopicViaApi, markTopicReadViaApi, postMessageViaApi } from "../../helpers/messaging-data.helpers";

test.describe("Messaging — scroll & highlight", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("met en surbrillance le message ciblé via le hash de l'URL (clic sur notification, page froide)", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-highlight-cold-${runId}`);
		createdTopicIds.push(topic.id);

		// Post enough messages so the target (oldest) is well above the visible viewport.
		const ids: string[] = [];
		for (let i = 0; i < 25; i += 1) {
			const m = await postMessageViaApi(apiClient, topic.id, `<p>msg-${i}-${runId}</p>`);
			ids.push(m.id);
		}
		const targetId = ids[0];

		await page.goto(`/messages/${topic.id}#message-${targetId}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();

		const targetRow = page.getByTestId(`message-${targetId}`);
		await expect(targetRow).toHaveAttribute("data-message-highlighted", "true");
		await expect(targetRow).toBeInViewport();

		// The flash fades after ~2.5s — assert the attribute disappears.
		await expect(targetRow).not.toHaveAttribute("data-message-highlighted", "true", { timeout: 5000 });
	});

	test("met en surbrillance lorsqu'on change uniquement le hash sur une page déjà ouverte (vrai bug du SW)", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-highlight-hot-${runId}`);
		createdTopicIds.push(topic.id);

		const ids: string[] = [];
		for (let i = 0; i < 25; i += 1) {
			const m = await postMessageViaApi(apiClient, topic.id, `<p>msg-${i}-${runId}</p>`);
			ids.push(m.id);
		}

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();
		await expect(page.getByTestId(`message-${ids[ids.length - 1]}`)).toBeVisible();

		const targetId = ids[2];
		// Simulate what the push-worker does via WindowClient.navigate(sameUrl#newHash) —
		// the browser fires `hashchange` only, NOT popstate. The custom `useUrlHash` hook
		// must catch this so the highlight kicks in even though react-router doesn't.
		await page.evaluate((id) => {
			window.location.hash = `message-${id}`;
		}, targetId);

		const targetRow = page.getByTestId(`message-${targetId}`);
		await expect(targetRow).toHaveAttribute("data-message-highlighted", "true");
		await expect(targetRow).toBeInViewport();
	});

	test("au chargement (sans notification), positionne le scroll sur le premier message non lu", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-unread-${runId}`);
		createdTopicIds.push(topic.id);

		const messages = [];
		const lastReadIndex = 7;
		const firstUnreadIndex = lastReadIndex + 1;
		for (let i = 0; i <= lastReadIndex; i += 1) {
			messages.push(await postMessageViaApi(apiClient, topic.id, `<p>msg-${i}-${runId}</p>`));
		}

		// Message timestamps are second-precision in the backend. Split the read and
		// unread batches so `createdAt > lastReadAt` identifies the first unread row.
		await page.waitForTimeout(1_100);

		for (let i = firstUnreadIndex; i < 25; i += 1) {
			messages.push(await postMessageViaApi(apiClient, topic.id, `<p>msg-${i}-${runId}</p>`));
		}

		// Mark the first 8 as read; the 9th should be the first unread and the scroll target.
		await markTopicReadViaApi(apiClient, topic.id, messages[lastReadIndex].createdAt);

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();
		// Wait for the list to render fully.
		await expect(page.getByTestId(`message-${messages[messages.length - 1].id}`)).toBeAttached();

		const firstUnreadRow = page.getByTestId(`message-${messages[firstUnreadIndex].id}`);
		const oldestRow = page.getByTestId(`message-${messages[0].id}`);
		const newestRow = page.getByTestId(`message-${messages[messages.length - 1].id}`);

		// The first unread message should be visible; the oldest (well above) and newest
		// (well below) should be off-screen.
		await expect(firstUnreadRow).toBeInViewport();
		await expect(oldestRow).not.toBeInViewport();
		await expect(newestRow).not.toBeInViewport();
	});
});
