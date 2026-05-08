import type { ReservationsState } from "./reservations.types";
import { monthKey } from "./reservations.types";

export { clearCreateState, invalidateAllMonths, reservationCreated, reservationUpdated, reservationDeleted } from "./reservations.reducer";
export { createReservation, deleteReservation, fetchLeaderboard, fetchMonthReservations, updateReservation } from "./reservations.async.actions";

export const selectMonth = (state: { reservations: ReservationsState }, year: number, month: number) => state.reservations.byMonth[monthKey(year, month)] ?? [];

export const selectMonthStatus = (state: { reservations: ReservationsState }, year: number, month: number) => state.reservations.monthStatus[monthKey(year, month)] ?? "idle";

export const selectLeaderboard = (state: { reservations: ReservationsState }) => state.reservations.leaderboard;

export const selectLeaderboardStatus = (state: { reservations: ReservationsState }) => state.reservations.leaderboardStatus;

export const selectLeaderboardRevision = (state: { reservations: ReservationsState }) => state.reservations.leaderboardRevision;

export const selectCreateStatus = (state: { reservations: ReservationsState }) => state.reservations.createStatus;

export const selectCreateError = (state: { reservations: ReservationsState }) => state.reservations.createError;
