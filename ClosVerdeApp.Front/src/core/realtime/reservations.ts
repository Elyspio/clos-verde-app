import * as signalR from "@microsoft/signalr";
import { baseURL } from "@/core/api/client";
import { getAccessToken } from "@/core/auth/token";
import { reservationCreated, reservationDeleted, reservationUpdated } from "@/store/modules/reservations/reservations.actions";
import type { AppDispatch } from "@/store";
import type { Reservation } from "@/types/models";

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

	connection.on("ReservationCreated", (reservation: Reservation) => {
		dispatch(reservationCreated(reservation));
	});

	connection.on("ReservationUpdated", (reservation: Reservation) => {
		dispatch(reservationUpdated(reservation));
	});

	connection.on("ReservationDeleted", (reservation: { id: string }) => {
		dispatch(reservationDeleted(reservation.id));
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
