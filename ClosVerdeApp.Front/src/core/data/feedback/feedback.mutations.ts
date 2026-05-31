import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import type { CreateFeedbackRequest, FeedbackStatus } from "@apis/rest/api/generated";
import { feedbackService } from "@/core/services/feedback.service";
import { feedbackKeys } from "./feedback.keys";

/**
 * Submits a new feedback entry. On success, invalidates every admin list query and the
 * current user's own list so the UI refreshes when either is open.
 */
function useCreate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (request: CreateFeedbackRequest) => {
			try {
				return await feedbackService.create(request);
			} catch (e) {
				throw new Error(extractApiError(e, "Envoi impossible."));
			}
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: feedbackKeys.adminLists() });
			void qc.invalidateQueries({ queryKey: feedbackKeys.mine() });
		},
	});
}

/** Admin: change a feedback's status (and optional admin note). Invalidates admin lists. */
function useUpdateStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, status, adminNote }: { id: string; status: FeedbackStatus; adminNote?: string | null }) => {
			try {
				return await feedbackService.updateStatus(id, { status, adminNote: adminNote ?? null });
			} catch (e) {
				throw new Error(extractApiError(e, "Mise à jour impossible."));
			}
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: feedbackKeys.adminLists() });
		},
	});
}

/** Admin: post a reply on a feedback's thread. Invalidates admin lists and the author's own list. */
function useAddReply() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, body }: { id: string; body: string }) => {
			try {
				return await feedbackService.addReply(id, { body });
			} catch (e) {
				throw new Error(extractApiError(e, "Envoi de la réponse impossible."));
			}
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: feedbackKeys.adminLists() });
			void qc.invalidateQueries({ queryKey: feedbackKeys.mine() });
		},
	});
}

/** Current user: close one of their own open tickets. */
function useCloseMine() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			try {
				return await feedbackService.closeMine(id);
			} catch (e) {
				throw new Error(extractApiError(e, "Clôture impossible."));
			}
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: feedbackKeys.mine() });
			void qc.invalidateQueries({ queryKey: feedbackKeys.adminLists() });
		},
	});
}

export const useFeedbackMutations = {
	create: useCreate,
	updateStatus: useUpdateStatus,
	addReply: useAddReply,
	closeMine: useCloseMine,
};
