import type { LeaderboardEntry, Reservation } from "@apis/rest/api/generated";

export type MonthKey = string;

export type ReservationsState = {
	byMonth: Record<MonthKey, Reservation[]>;
	monthStatus: Record<MonthKey, "idle" | "loading" | "ready" | "error">;
	leaderboard: LeaderboardEntry[];
	leaderboardStatus: "idle" | "loading" | "ready" | "error";
	leaderboardRevision: number;
	createStatus: "idle" | "loading" | "error" | "success";
	createError: string | null;
};

export const monthKey = (year: number, month: number): MonthKey => `${year}-${String(month).padStart(2, "0")}`;

export const parseMonthKey = (key: MonthKey) => {
	const [year, month] = key.split("-").map(Number);
	return Number.isInteger(year) && Number.isInteger(month) ? { year, month } : null;
};

export const overlapsMonth = (reservation: Reservation, year: number, month: number) => {
	const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
	const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);
	const start = new Date(reservation.startDate);
	const end = new Date(reservation.endDate);
	return end > monthStart && start < monthEnd;
};

export function refreshCachedMonths(state: ReservationsState, reservation: Reservation) {
	// Cancelled reservations are hidden by the backend on read — treat the SignalR update as a
	// removal so auto-cancelled rows don't linger in cached months until the next full refetch.
	if (reservation.validation.status === "Cancelled") {
		removeFromCachedMonths(state, reservation.id);
		return;
	}

	for (const [key, entries] of Object.entries(state.byMonth)) {
		const parsed = parseMonthKey(key);
		if (!parsed) continue;

		const index = entries.findIndex((item) => item.id === reservation.id);
		const shouldContain = overlapsMonth(reservation, parsed.year, parsed.month);

		if (shouldContain) {
			if (index >= 0) entries[index] = reservation;
			else entries.push(reservation);
			entries.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
			state.monthStatus[key] = "ready";
		} else if (index >= 0) {
			entries.splice(index, 1);
			state.monthStatus[key] = "ready";
		}
	}
}

export function removeFromCachedMonths(state: ReservationsState, id: string) {
	for (const [key, entries] of Object.entries(state.byMonth)) {
		const nextEntries = entries.filter((item) => item.id !== id);
		if (nextEntries.length !== entries.length) {
			state.byMonth[key] = nextEntries;
			state.monthStatus[key] = "ready";
		}
	}
}
