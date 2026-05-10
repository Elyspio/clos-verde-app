import type { CreateReservationRequest } from "@apis/rest/api/generated";
import { backendApi } from "@apis/rest/api/clients/api.client";

export const reservationsService = {
	getRange: async (from: string, to: string) => (await backendApi.reservationGetRange(from, to)).data,
	getAll: async () => (await backendApi.reservationGetRange()).data,
	create: async (payload: CreateReservationRequest) => (await backendApi.reservationCreate(payload)).data,
	update: async (id: string, payload: CreateReservationRequest) => (await backendApi.reservationUpdate(id, payload)).data,
	remove: async (id: string) => {
		await backendApi.reservationDelete(id);
	},
	leaderboard: async () => (await backendApi.reservationGetLeaderboard()).data,
	forceValidate: async (id: string) => (await backendApi.reservationForceValidate(id)).data,
	createObjection: async (id: string, reason?: string) => (await backendApi.reservationCreateObjection(id, { reason })).data,
};
