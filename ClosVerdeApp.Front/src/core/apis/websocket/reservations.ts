import * as signalR from "@microsoft/signalr";
import { baseURL } from "@apis/rest/api/clients/api.client";
import type { ReservationChangedEvent } from "@apis/rest/api/generated";
import { getAccessToken } from "@/core/auth/token";

export type ReservationsHubHandlers = {
	onReservationChanged: (event: ReservationChangedEvent) => void;
};

let connection: signalR.HubConnection | null = null;

function ensureConnection(handlers: ReservationsHubHandlers) {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${baseURL.replace(/\/$/, "")}/hubs/reservations`, {
			accessTokenFactory: () => getAccessToken() ?? "",
		})
		.withAutomaticReconnect()
		.configureLogging(signalR.LogLevel.Information)
		.build();

	connection.on("ReservationChanged", (change: ReservationChangedEvent) => handlers.onReservationChanged(change));

	return connection;
}

export async function startReservationsHub(handlers: ReservationsHubHandlers) {
	const hub = ensureConnection(handlers);
	if (hub.state === signalR.HubConnectionState.Connected || hub.state === signalR.HubConnectionState.Connecting) return;
	await hub.start();
}

export async function stopReservationsHub() {
	if (!connection) return;
	await connection.stop();
	connection = null;
}
