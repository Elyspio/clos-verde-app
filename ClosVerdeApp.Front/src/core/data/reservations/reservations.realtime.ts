import type { QueryClient } from "@tanstack/react-query";
import type { ReservationChangedEvent } from "@apis/rest/api/generated";
import { reservationsKeys } from "./reservations.keys";
import { reservationsCache } from "./reservations.cache";

/**
 * Handles `ReservationChanged` from SignalR.
 * Created/Updated → patches all overlapping month caches; invalidates leaderboard.
 * Deleted → removes from all month caches; invalidates leaderboard.
 * Leaderboard is always refetched (server-computed ranking, can't be patched locally).
 */
function onReservationChanged(qc: QueryClient, event: ReservationChangedEvent) {
	switch (event.action) {
		case "Created":
		case "Updated":
			reservationsCache.refreshMonths(qc, event.reservation);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
			return;
		case "Deleted":
			reservationsCache.removeFromMonths(qc, event.reservation.id);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
			return;
	}
}

export const reservationsRealtime = {
	onReservationChanged,
};
