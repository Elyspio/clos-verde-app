import * as signalR from "@microsoft/signalr";
import { baseURL } from "@/core/api/client";
import { getAccessToken } from "@/core/auth/token";
import type { AppDispatch } from "@/store";
import type { Message, Topic } from "@/types/models";
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

	connection.on("TopicCreated", (topic: Topic) => dispatch(topicCreated(topic)));
	connection.on("TopicUpdated", (topic: Topic) => dispatch(topicUpdated(topic)));
	connection.on("TopicDeleted", (topicId: string) => dispatch(topicDeleted(topicId)));

	connection.on("MessageCreated", (message: Message) => dispatch(messageCreated(message)));
	connection.on("MessageUpdated", (message: Message) => dispatch(messageUpdated(message)));
	connection.on("MessageDeleted", (topicId: string, messageId: string) => dispatch(messageDeleted({ topicId, messageId })));

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
