import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, createTopicViaApi, postMessageViaApi } from "../../helpers/messaging-data.helpers";

test.describe("Messaging — SignalR (WebSocket)", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("établit la connexion WebSocket au hub `/hubs/messages` (auth via access_token en query)", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-signalr-ws-${runId}`);
		createdTopicIds.push(topic.id);

		const wsPromise = page.waitForEvent("websocket", {
			predicate: (ws) => ws.url().includes("/hubs/messages"),
			timeout: 15_000,
		});

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();

		const ws = await wsPromise;

		// Auth via query string is the whole point: WebSockets can't carry an Authorization header.
		expect(ws.url()).toMatch(/[?&]access_token=/);

		// If the server rejects the upgrade (e.g. JWT not read from query), SignalR closes the
		// socket immediately with the misleading "connection ID is not present on the server"
		// error. A healthy connection stays open well past the handshake.
		await page.waitForTimeout(3_000);
		expect(ws.isClosed(), "Le WebSocket SignalR s'est fermé juste après la négociation (auth probablement rejetée).").toBe(false);
	});

	test("reçoit en temps réel un message posté par un autre utilisateur via le hub", async ({ apiClient, apiClientFor, page }) => {
		const runId = createRunId();
		const camilleClient = await apiClientFor("camille");
		const topic = await createTopicViaApi(apiClient, `e2e-signalr-rt-${runId}`);
		createdTopicIds.push(topic.id);

		const wsPromise = page.waitForEvent("websocket", {
			predicate: (ws) => ws.url().includes("/hubs/messages"),
			timeout: 15_000,
		});

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();
		await wsPromise;

		// Post from a different user *after* the hub is up — the message must arrive via SignalR,
		// not via the initial GET. We don't reload the page.
		const body = `realtime ${runId}`;
		const message = await postMessageViaApi(camilleClient, topic.id, `<p>${body}</p>`);

		const messageRow = page.getByTestId(`message-${message.id}`);
		await expect(messageRow).toBeVisible({ timeout: 10_000 });
		await expect(messageRow).toContainText(body);
	});
});
