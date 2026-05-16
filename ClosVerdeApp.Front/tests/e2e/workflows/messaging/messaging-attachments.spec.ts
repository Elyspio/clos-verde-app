import { Buffer } from "node:buffer";
import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupTopics, createTopicViaApi, downloadAttachmentViaApi, postMessageViaApi, uploadAttachmentViaApi } from "../../helpers/messaging-data.helpers";
import { tiptapEditable, typeInComposer, waitForComposerReady } from "../../helpers/tiptap.helpers";

// A minimal 1x1 transparent PNG — small enough to keep tests snappy while still
// exercising the binary upload/download path.
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=";

function tinyPng(): Buffer {
	return Buffer.from(TINY_PNG_BASE64, "base64");
}

test.describe("Messaging — attachments", () => {
	const createdTopicIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupTopics(apiClient, createdTopicIds);
		createdTopicIds.length = 0;
	});

	test("téléverse un fichier en streaming via l'API et le récupère intact", async ({ apiClient }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-attach-api-${runId}`);
		createdTopicIds.push(topic.id);

		const fileBytes = tinyPng();
		const attachment = await uploadAttachmentViaApi(apiClient, {
			name: `pixel-${runId}.png`,
			mimeType: "image/png",
			buffer: fileBytes,
		});

		expect(attachment.fileName).toBe(`pixel-${runId}.png`);
		expect(attachment.contentType).toBe("image/png");
		expect(attachment.sizeBytes).toBe(fileBytes.byteLength);
		expect(attachment.isImage).toBe(true);
		expect(attachment.downloadUrl).toBe(`/api/attachments/${attachment.id}`);

		const message = await postMessageViaApi(apiClient, topic.id, "<p>voici la photo</p>", [attachment.id]);
		expect(message.attachments).toHaveLength(1);
		expect(message.attachments?.[0]?.id).toBe(attachment.id);

		const downloaded = await downloadAttachmentViaApi(apiClient, attachment.downloadUrl);
		expect(downloaded.equals(fileBytes)).toBe(true);
	});

	test("refuse une pièce jointe avec une extension exécutable", async ({ apiClient }) => {
		const runId = createRunId();
		const response = await apiClient.post("/api/attachments", {
			multipart: {
				file: {
					name: `malware-${runId}.exe`,
					mimeType: "application/octet-stream",
					buffer: Buffer.from("MZ\x90\x00", "binary"),
				},
			},
		});
		expect(response.status()).toBe(400);
	});

	test("refuse un message d'un autre utilisateur référencant une pièce jointe", async ({ apiClient, apiClientFor }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-attach-forbid-${runId}`);
		createdTopicIds.push(topic.id);

		const camilleClient = await apiClientFor("camille");
		const camilleUpload = await uploadAttachmentViaApi(camilleClient, {
			name: `camille-${runId}.png`,
			mimeType: "image/png",
			buffer: tinyPng(),
		});

		const response = await apiClient.post(`/api/topics/${topic.id}/messages`, {
			data: { contentHtml: "<p>vol</p>", attachmentIds: [camilleUpload.id] },
		});
		expect(response.status()).toBe(403);
	});

	test("permet d'envoyer un message contenant uniquement une pièce jointe", async ({ apiClient }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-attach-only-${runId}`);
		createdTopicIds.push(topic.id);

		const attachment = await uploadAttachmentViaApi(apiClient, {
			name: `solo-${runId}.png`,
			mimeType: "image/png",
			buffer: tinyPng(),
		});

		const message = await postMessageViaApi(apiClient, topic.id, "", [attachment.id]);
		expect(message.contentHtml).toBe("");
		expect(message.attachments?.[0]?.id).toBe(attachment.id);
	});

	test("téléverse depuis le composer, envoie, et affiche la miniature dans le fil", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-attach-ui-${runId}`);
		createdTopicIds.push(topic.id);

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();

		const fileName = `composer-${runId}.png`;
		const uploadPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/attachments");
		await page.getByTestId("message-composer-file-input").setInputFiles({
			name: fileName,
			mimeType: "image/png",
			buffer: tinyPng(),
		});
		const uploadResponse = await uploadPromise;
		expect(uploadResponse.status(), `POST /api/attachments: ${await uploadResponse.text()}`).toBe(201);
		const uploadedAttachment = (await uploadResponse.json()) as { id: string; fileName: string };
		expect(uploadedAttachment.fileName).toBe(fileName);

		// Wait for the pending attachment card to flip from "uploading" to "ready".
		const attachmentCard = page.locator('[data-testid^="message-composer-attachment-"][data-attachment-status="ready"]');
		await expect(attachmentCard).toBeVisible();

		await typeInComposer(page, `photo ${runId}`);
		await waitForComposerReady(page);

		const postPromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/topics/${topic.id}/messages`);
		await page.getByTestId("message-composer-submit").click();
		const postResponse = await postPromise;
		expect(postResponse.status(), `POST message: ${await postResponse.text()}`).toBe(201);

		const message = (await postResponse.json()) as { id: string; attachments?: { id: string }[] };
		expect(message.attachments?.[0]?.id).toBe(uploadedAttachment.id);

		const messageRow = page.getByTestId(`message-${message.id}`);
		await expect(messageRow).toBeVisible();
		await expect(messageRow).toContainText(`photo ${runId}`);
		await expect(messageRow.getByTestId(`message-attachment-image-${uploadedAttachment.id}`)).toBeVisible();

		// Composer clears after a successful post.
		await expect(tiptapEditable(page)).toHaveText("");
		await expect(page.locator('[data-testid^="message-composer-attachment-"]')).toHaveCount(0);
	});

	test("retirer une pièce jointe en attente la fait disparaître du composer", async ({ apiClient, page }) => {
		const runId = createRunId();
		const topic = await createTopicViaApi(apiClient, `e2e-attach-remove-${runId}`);
		createdTopicIds.push(topic.id);

		await page.goto(`/messages/${topic.id}`);
		await expect(page.getByTestId("topic-view")).toBeVisible();

		await page.getByTestId("message-composer-file-input").setInputFiles({
			name: `removeme-${runId}.png`,
			mimeType: "image/png",
			buffer: tinyPng(),
		});

		const card = page.locator('[data-testid^="message-composer-attachment-"][data-attachment-status="ready"]');
		await expect(card).toBeVisible();

		const tempId = (await card.getAttribute("data-testid"))?.replace("message-composer-attachment-", "") ?? "";
		expect(tempId).not.toBe("");

		await page.getByTestId(`message-composer-attachment-remove-${tempId}`).click();
		await expect(page.locator('[data-testid^="message-composer-attachment-"]')).toHaveCount(0);
	});
});
