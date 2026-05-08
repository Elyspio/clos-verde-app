import { backendApi } from "./client";
import type { CreateReservationRequest } from "./generated";
import { axiosInstance } from "./client";

export const reservationApi = {
	getMonth: async (year: number, month: number) => (await backendApi.getMonth(year, month)).data,
	create: async (payload: CreateReservationRequest) => (await backendApi.create(payload)).data,
	update: async (id: string, payload: CreateReservationRequest) => (await axiosInstance.put(`/api/reservations/${id}`, payload)).data,
	remove: async (id: string) => {
		await backendApi._delete(id);
	},
	leaderboard: async () => (await backendApi.getLeaderboard()).data,
};
