import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@/core/api/client";
import { reservationApi } from "@/core/api/reservation.api";
import type { CreateReservationRequest, LeaderboardEntry, Reservation } from "@/types/models";
import { monthKey, type MonthKey } from "./reservations.types";

export const fetchMonthReservations = createAsyncThunk<{ key: MonthKey; reservations: Reservation[] }, { year: number; month: number }>(
	"reservations/fetchMonth",
	async ({ year, month }, { rejectWithValue }) => {
		try {
			const reservations = await reservationApi.getMonth(year, month);
			return { key: monthKey(year, month), reservations };
		} catch (error) {
			return rejectWithValue(extractApiError(error));
		}
	},
);

export const createReservation = createAsyncThunk<Reservation, CreateReservationRequest>("reservations/create", async (payload, { rejectWithValue }) => {
	try {
		return await reservationApi.create(payload);
	} catch (error) {
		return rejectWithValue(extractApiError(error, "Réservation impossible."));
	}
});

export const updateReservation = createAsyncThunk<Reservation, { id: string; payload: CreateReservationRequest }>(
	"reservations/update",
	async ({ id, payload }, { rejectWithValue }) => {
		try {
			return await reservationApi.update(id, payload);
		} catch (error) {
			return rejectWithValue(extractApiError(error, "Modification impossible."));
		}
	},
);

export const deleteReservation = createAsyncThunk<string, string>("reservations/delete", async (id, { rejectWithValue }) => {
	try {
		await reservationApi.remove(id);
		return id;
	} catch (error) {
		return rejectWithValue(extractApiError(error, "Suppression impossible."));
	}
});

export const fetchLeaderboard = createAsyncThunk<LeaderboardEntry[]>("reservations/fetchLeaderboard", async (_, { rejectWithValue }) => {
	try {
		return await reservationApi.leaderboard();
	} catch (error) {
		return rejectWithValue(extractApiError(error));
	}
});
