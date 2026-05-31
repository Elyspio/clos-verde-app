import * as signalR from "@microsoft/signalr";
import { baseURL } from "@apis/rest/api/clients/api.client";
import type { FeedbackChangedEvent } from "@apis/rest/api/generated";
import { getAccessToken } from "@/core/auth/token";

export type FeedbackHubHandlers = {
	onFeedbackChanged: (event: FeedbackChangedEvent) => void;
};

let connection: signalR.HubConnection | null = null;

function ensureConnection(handlers: FeedbackHubHandlers) {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${baseURL.replace(/\/$/, "")}/hubs/feedback`, {
			accessTokenFactory: () => getAccessToken() ?? "",
		})
		.withAutomaticReconnect()
		.configureLogging(signalR.LogLevel.Information)
		.build();

	connection.on("FeedbackChanged", (change: FeedbackChangedEvent) => handlers.onFeedbackChanged(change));

	return connection;
}

/** Open the SignalR connection for the admin-only feedback hub. */
export async function startFeedbackHub(handlers: FeedbackHubHandlers) {
	const hub = ensureConnection(handlers);
	if (hub.state === signalR.HubConnectionState.Connected || hub.state === signalR.HubConnectionState.Connecting) return;
	await hub.start();
}

/** Close the SignalR feedback connection (e.g. on logout, role change, or unmount). */
export async function stopFeedbackHub() {
	if (!connection) return;
	await connection.stop();
	connection = null;
}
