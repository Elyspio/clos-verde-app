import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Reservation } from "@/types/models";
import { createReservation, deleteReservation, fetchLeaderboard, fetchMonthReservations, updateReservation } from "./reservations.async.actions";
import { monthKey, refreshCachedMonths, removeFromCachedMonths, type ReservationsState } from "./reservations.types";

const initialState: ReservationsState = {
	byMonth: {},
	monthStatus: {},
	leaderboard: [],
	leaderboardStatus: "idle",
	leaderboardRevision: 0,
	createStatus: "idle",
	createError: null,
};

const slice = createSlice({
	name: "reservations",
	initialState,
	reducers: {
		clearCreateState(state) {
			state.createStatus = "idle";
			state.createError = null;
		},
		reservationCreated(state, action: PayloadAction<Reservation>) {
			refreshCachedMonths(state, action.payload);
			state.leaderboardRevision += 1;
			state.leaderboardStatus = "idle";
		},
		reservationUpdated(state, action: PayloadAction<Reservation>) {
			refreshCachedMonths(state, action.payload);
			state.leaderboardRevision += 1;
			state.leaderboardStatus = "idle";
		},
		reservationDeleted(state, action: PayloadAction<string>) {
			removeFromCachedMonths(state, action.payload);
			state.leaderboardRevision += 1;
			state.leaderboardStatus = "idle";
		},
		invalidateAllMonths(state) {
			state.byMonth = {};
			state.monthStatus = {};
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchMonthReservations.pending, (state, action) => {
				state.monthStatus[monthKey(action.meta.arg.year, action.meta.arg.month)] = "loading";
			})
			.addCase(fetchMonthReservations.fulfilled, (state, action) => {
				state.byMonth[action.payload.key] = action.payload.reservations;
				state.monthStatus[action.payload.key] = "ready";
			})
			.addCase(fetchMonthReservations.rejected, (state, action) => {
				state.monthStatus[monthKey(action.meta.arg.year, action.meta.arg.month)] = "error";
			})
			.addCase(createReservation.pending, (state) => {
				state.createStatus = "loading";
				state.createError = null;
			})
			.addCase(createReservation.fulfilled, (state, action) => {
				state.createStatus = "success";
				refreshCachedMonths(state, action.payload);
				state.leaderboardRevision += 1;
				state.leaderboardStatus = "idle";
			})
			.addCase(createReservation.rejected, (state, action) => {
				state.createStatus = "error";
				state.createError = (action.payload as string) ?? "Réservation impossible.";
			})
			.addCase(updateReservation.pending, (state) => {
				state.createStatus = "loading";
				state.createError = null;
			})
			.addCase(updateReservation.fulfilled, (state, action) => {
				state.createStatus = "success";
				refreshCachedMonths(state, action.payload);
				state.leaderboardRevision += 1;
				state.leaderboardStatus = "idle";
			})
			.addCase(updateReservation.rejected, (state, action) => {
				state.createStatus = "error";
				state.createError = (action.payload as string) ?? "Modification impossible.";
			})
			.addCase(deleteReservation.fulfilled, (state, action) => {
				removeFromCachedMonths(state, action.payload);
				state.leaderboardRevision += 1;
				state.leaderboardStatus = "idle";
			})
			.addCase(fetchLeaderboard.pending, (state) => {
				state.leaderboardStatus = "loading";
			})
			.addCase(fetchLeaderboard.fulfilled, (state, action) => {
				state.leaderboard = action.payload;
				state.leaderboardStatus = "ready";
			})
			.addCase(fetchLeaderboard.rejected, (state) => {
				state.leaderboardStatus = "error";
			});
	},
});

export const { clearCreateState, invalidateAllMonths, reservationCreated, reservationUpdated, reservationDeleted } = slice.actions;

export const reservationsReducer = slice.reducer;
