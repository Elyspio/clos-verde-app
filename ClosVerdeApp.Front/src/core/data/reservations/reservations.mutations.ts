import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import type { CreateReservationRequest } from "@apis/rest/api/generated";
import { reservationsService } from "@/core/services/reservations.service";
import { reservationsKeys } from "./reservations.keys";
import { reservationsCache } from "./reservations.cache";

/** Creates a reservation. Cache: patches all overlapping month caches; invalidates leaderboard. */
function useCreate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateReservationRequest) => {
			try {
				return await reservationsService.create(payload);
			} catch (e) {
				throw new Error(extractApiError(e, "Réservation impossible."));
			}
		},
		onSuccess: (reservation) => {
			reservationsCache.refreshMonths(qc, reservation);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
		},
	});
}

/**
 * Updates a reservation's dates / note.
 * Cache: `refreshMonths` handles date shifts — removes from old months, adds to new ones.
 */
function useUpdate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, payload }: { id: string; payload: CreateReservationRequest }) => {
			try {
				return await reservationsService.update(id, payload);
			} catch (e) {
				throw new Error(extractApiError(e, "Modification impossible."));
			}
		},
		onSuccess: (reservation) => {
			reservationsCache.refreshMonths(qc, reservation);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
		},
	});
}

/** Cancels / deletes a reservation. Cache: removes from all month caches; invalidates leaderboard. */
function useDelete() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			try {
				await reservationsService.remove(id);
				return id;
			} catch (e) {
				throw new Error(extractApiError(e, "Suppression impossible."));
			}
		},
		onSuccess: (id) => {
			reservationsCache.removeFromMonths(qc, id);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
		},
	});
}

/**
 * Force-validates a pending reservation (creator override, bypasses the objection period).
 * Cache: upserts the validated reservation; invalidates leaderboard.
 */
function useForceValidate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			try {
				return await reservationsService.forceValidate(id);
			} catch (e) {
				throw new Error(extractApiError(e, "Validation impossible."));
			}
		},
		onSuccess: (reservation) => {
			reservationsCache.refreshMonths(qc, reservation);
			void qc.invalidateQueries({ queryKey: reservationsKeys.leaderboard() });
		},
	});
}

/**
 * Files an objection against another user's pending reservation.
 * No local cache patch — the server pushes a `ReservationChanged` event via SignalR
 * which handles the cache update.
 */
function useCreateObjection() {
	return useMutation({
		mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
			try {
				return await reservationsService.createObjection(id, reason);
			} catch (e) {
				throw new Error(extractApiError(e, "Objection impossible."));
			}
		},
	});
}

export const useReservationsMutations = {
	create: useCreate,
	update: useUpdate,
	delete: useDelete,
	forceValidate: useForceValidate,
	createObjection: useCreateObjection,
};
