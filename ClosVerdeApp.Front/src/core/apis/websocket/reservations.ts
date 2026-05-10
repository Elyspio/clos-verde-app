import * as signalR from "@microsoft/signalr";
import { baseURL } from "@apis/rest/api/clients/api.client";
import type { ReservationChangedEvent } from "@apis/rest/api/generated";
import { getAccessToken } from "@/core/auth/token";
import { reservationCreated, reservationDeleted, reservationUpdated } from "@/store/modules/reservations/reservations.actions";
import type { AppDispatch } from "@/store";

let connection: signalR.HubConnection | null = null;

function ensureConnection(dispatch: AppDispatch) {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${baseURL.replace(/\/$/, "")}/hubs/reservations`, {
			accessTokenFactory: () => getAccessToken() ?? "",
		})
		.withAutomaticReconnect()
		.configureLogging(signalR.LogLevel.Information)
		.build();

	connection.on("ReservationChanged", (change: ReservationChangedEvent) => {
		switch (change.action) {
			case "Created":
				dispatch(reservationCreated(change.reservation));
				break;
			case "Updated":
				dispatch(reservationUpdated(change.reservation));
				break;
			case "Deleted":
				dispatch(reservationDeleted(change.reservation.id));
				break;
		}
	});

	return connection;
}

export async function startReservationRealtime(dispatch: AppDispatch) {
	const hub = ensureConnection(dispatch);
	if (hub.state === signalR.HubConnectionState.Connected || hub.state === signalR.HubConnectionState.Connecting) return;
	await hub.start();
}

export async function stopReservationRealtime() {
	if (!connection) return;
	await connection.stop();
	connection = null;
}
