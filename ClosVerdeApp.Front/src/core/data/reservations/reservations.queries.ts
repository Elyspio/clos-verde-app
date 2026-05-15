import { useQuery } from "@tanstack/react-query";
import { reservationsService } from "@/core/services/reservations.service";
import { reservationsKeys } from "./reservations.keys";

/**
 * Reservations overlapping a given calendar month.
 * Window: `[1st 00:00, 1st of next month 00:00)` UTC — multi-month reservations appear in each overlapping month.
 * `staleTime: 60 s` — SignalR keeps the cache current; this is a safety-net interval only.
 */
function useByMonth(year: number, month: number) {
	return useQuery({
		queryKey: reservationsKeys.month(year, month),
		queryFn: () => {
			const from = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
			const to = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
			return reservationsService.getRange(from, to);
		},
		staleTime: 60_000,
	});
}

/** All-time leaderboard. Invalidated on every mutation; `staleTime: 60 s` as a fallback. */
function useLeaderboard() {
	return useQuery({
		queryKey: reservationsKeys.leaderboard(),
		queryFn: () => reservationsService.leaderboard(),
		staleTime: 60_000,
	});
}

export const useReservationsQueries = {
	byMonth: useByMonth,
	leaderboard: useLeaderboard,
};
