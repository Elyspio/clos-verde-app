export type { Reservation, CreateReservationRequest, LeaderboardEntry } from "@/core/api/generated";

export type ApiError = { status: number; message: string };

export type AuthUser = {
	id: string;
	displayName?: string;
	email?: string;
};
