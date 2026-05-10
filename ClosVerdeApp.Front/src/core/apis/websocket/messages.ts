import * as signalR from "@microsoft/signalr";
import { baseURL } from "@apis/rest/api/clients/api.client";
import type { MessageChangedEvent, TopicChangedEvent } from "@apis/rest/api/generated";
import { getAccessToken } from "@/core/auth/token";
import type { AppDispatch } from "@/store";
import { messageCreated, messageDeleted, messageUpdated } from "@/store/modules/messages/messages.actions";
import { topicCreated, topicDeleted, topicUpdated } from "@/store/modules/topics/topics.actions";
import { readReceiptUpdated } from "@/store/modules/unread/unread.actions";

let connection: signalR.HubConnection | null = null;

function ensureConnection(dispatch: AppDispatch) {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${baseURL.replace(/\/$/, "")}/hubs/messages`, {
			accessTokenFactory: () => getAccessToken() ?? "",
		})
		.withAutomaticReconnect()
		.configureLogging(signalR.LogLevel.Information)
		.build();

	connection.on("TopicChanged", (change: TopicChangedEvent) => {
		switch (change.action) {
			case "Created":
				if (change.topic) dispatch(topicCreated(change.topic));
				break;
			case "Updated":
				if (change.topic) dispatch(topicUpdated(change.topic));
				break;
			case "Deleted":
				if (change.topicId) dispatch(topicDeleted(change.topicId));
				break;
		}
	});

	connection.on("MessageChanged", (change: MessageChangedEvent) => {
		switch (change.action) {
			case "Created":
				if (change.message) dispatch(messageCreated(change.message));
				break;
			case "Updated":
				if (change.message) dispatch(messageUpdated(change.message));
				break;
			case "Deleted":
				if (change.topicId && change.messageId) dispatch(messageDeleted({ topicId: change.topicId, messageId: change.messageId }));
				break;
		}
	});

	connection.on("ReadReceiptUpdated", (topicId: string, lastReadAt: string) => dispatch(readReceiptUpdated({ topicId, lastReadAt })));

	return connection;
}

/** Open the SignalR connection for the messaging hub and wire incoming events into Redux. */
export async function startMessagesRealtime(dispatch: AppDispatch) {
	const hub = ensureConnection(dispatch);
	if (hub.state === signalR.HubConnectionState.Connected || hub.state === signalR.HubConnectionState.Connecting) return;
	await hub.start();
}

/** Close the SignalR messaging connection (e.g. on logout or unmount). */
export async function stopMessagesRealtime() {
	if (!connection) return;
	await connection.stop();
	connection = null;
}
