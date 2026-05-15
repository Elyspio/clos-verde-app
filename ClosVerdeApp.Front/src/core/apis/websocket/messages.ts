import * as signalR from "@microsoft/signalr";
import { baseURL } from "@apis/rest/api/clients/api.client";
import type { MessageChangedEvent, TopicChangedEvent } from "@apis/rest/api/generated";
import { getAccessToken } from "@/core/auth/token";

export type MessagesHubHandlers = {
	onTopicChanged: (event: TopicChangedEvent) => void;
	onMessageChanged: (event: MessageChangedEvent) => void;
	onReadReceiptUpdated: (topicId: string, lastReadAt: string) => void;
};

let connection: signalR.HubConnection | null = null;

function ensureConnection(handlers: MessagesHubHandlers) {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${baseURL.replace(/\/$/, "")}/hubs/messages`, {
			accessTokenFactory: () => getAccessToken() ?? "",
		})
		.withAutomaticReconnect()
		.configureLogging(signalR.LogLevel.Information)
		.build();

	connection.on("TopicChanged", (change: TopicChangedEvent) => handlers.onTopicChanged(change));
	connection.on("MessageChanged", (change: MessageChangedEvent) => handlers.onMessageChanged(change));
	connection.on("ReadReceiptUpdated", (topicId: string, lastReadAt: string) => handlers.onReadReceiptUpdated(topicId, lastReadAt));

	return connection;
}

/** Open the SignalR connection for the messaging hub and dispatch incoming events to handlers. */
export async function startMessagesHub(handlers: MessagesHubHandlers) {
	const hub = ensureConnection(handlers);
	if (hub.state === signalR.HubConnectionState.Connected || hub.state === signalR.HubConnectionState.Connecting) return;
	await hub.start();
}

/** Close the SignalR messaging connection (e.g. on logout or unmount). */
export async function stopMessagesHub() {
	if (!connection) return;
	await connection.stop();
	connection = null;
}
