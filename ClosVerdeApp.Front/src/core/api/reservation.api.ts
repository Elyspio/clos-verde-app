import type { CreateReservationRequest, Objection, Reservation } from "@/types/models";
import type { LeaderboardEntry } from "./generated";
import { axiosInstance } from "./client";

/** HTTP adapter for the reservation REST surface (CRUD + collaborative-validation actions). */
export const reservationApi = {
	getMonth: async (year: number, month: number) => (await axiosInstance.get<Reservation[]>(`/api/reservations`, { params: { year, month } })).data,
	getAll: async () => (await axiosInstance.get<Reservation[]>(`/api/reservations`)).data,
	create: async (payload: CreateReservationRequest) => (await axiosInstance.post<Reservation>(`/api/reservations`, payload)).data,
	update: async (id: string, payload: CreateReservationRequest) => (await axiosInstance.put<Reservation>(`/api/reservations/${id}`, payload)).data,
	remove: async (id: string) => {
		await axiosInstance.delete(`/api/reservations/${id}`);
	},
	leaderboard: async () => (await axiosInstance.get<LeaderboardEntry[]>(`/api/reservations/leaderboard`)).data,
	forceValidate: async (id: string) => (await axiosInstance.post<Reservation>(`/api/reservations/${id}/validate`)).data,
	listObjections: async (id: string) => (await axiosInstance.get<Objection[]>(`/api/reservations/${id}/objections`)).data,
	createObjection: async (id: string, reason?: string) => (await axiosInstance.post<Objection>(`/api/reservations/${id}/objections`, { reason })).data,
};
