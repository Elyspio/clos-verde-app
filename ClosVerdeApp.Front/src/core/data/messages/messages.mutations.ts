import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import type { Attachment, Message } from "@apis/rest/api/generated";
import { messagesService } from "@/core/services/messages.service";
import { useCurrentUserId } from "@data/client/useCurrentUserId";
import { topicsKeys } from "@data/topics/topics.keys";
import { messagesKeys } from "./messages.keys";
import { messagesCache, type MessagesPages } from "./messages.cache";

export type PostMessagePayload = {
	contentHtml: string;
	attachments: Attachment[];
};

function buildOptimisticMessage(args: { tempId: string; topicId: string; userId: string; displayName: string; contentHtml: string; attachments: Attachment[] }): Message {
	return {
		id: args.tempId,
		topicId: args.topicId,
		authorUserId: args.userId,
		authorDisplayName: args.displayName,
		contentHtml: args.contentHtml,
		mentions: [],
		attachments: args.attachments,
		createdAt: new Date().toISOString(),
		editedAt: null,
		isDeleted: false,
		isSystem: false,
	};
}

/**
 * Posts a message with optimistic UI.
 * onMutate: cancels in-flight fetches, appends a temp message.
 * onError: rolls back to snapshot.
 * onSuccess: swaps temp id for the real server message; invalidates engaged topics.
 */
function usePost(topicId: string) {
	const qc = useQueryClient();
	const userId = useCurrentUserId();
	const { user } = useAuth();
	return useMutation({
		mutationFn: async ({ contentHtml, attachments }: PostMessagePayload) => {
			try {
				return await messagesService.post(
					topicId,
					contentHtml,
					attachments.map((a) => a.id),
				);
			} catch (e) {
				throw new Error(extractApiError(e, "Envoi impossible."));
			}
		},
		onMutate: async ({ contentHtml, attachments }) => {
			await qc.cancelQueries({ queryKey: messagesKeys.list(topicId) });
			const snapshot = qc.getQueryData<MessagesPages>(messagesKeys.list(topicId));
			if (!userId) return { snapshot, tempId: null as string | null };
			const tempId = `temp-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
			const displayName = user?.profile?.name ?? user?.profile?.preferred_username ?? "Vous";
			const optimistic = buildOptimisticMessage({ tempId, topicId, userId, displayName, contentHtml, attachments });
			qc.setQueryData<MessagesPages>(messagesKeys.list(topicId), (old) => messagesCache.appendOptimistic(old, optimistic));
			return { snapshot, tempId };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.snapshot) qc.setQueryData(messagesKeys.list(topicId), ctx.snapshot);
		},
		onSuccess: (real, _vars, ctx) => {
			if (ctx?.tempId) {
				qc.setQueryData<MessagesPages>(messagesKeys.list(topicId), (old) => messagesCache.replaceOptimistic(old, ctx.tempId!, real));
			} else {
				qc.setQueryData<MessagesPages>(messagesKeys.list(topicId), (old) => messagesCache.upsertInPages(old, real));
			}
			void qc.invalidateQueries({ queryKey: topicsKeys.engaged() });
		},
	});
}

/** Edits message content. Cache: upserts the updated message in place. */
function useEdit() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, contentHtml }: { id: string; contentHtml: string }) => {
			try {
				return await messagesService.edit(id, contentHtml);
			} catch (e) {
				throw new Error(extractApiError(e, "Modification impossible."));
			}
		},
		onSuccess: (message) => {
			qc.setQueryData<MessagesPages>(messagesKeys.list(message.topicId), (old) => messagesCache.upsertInPages(old, message));
		},
	});
}

/**
 * Soft-deletes a message.
 * Cache: upserts the server-returned message (isDeleted: true) so the UI can show a placeholder.
 */
function useDelete() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			try {
				return await messagesService.remove(id);
			} catch (e) {
				throw new Error(extractApiError(e, "Suppression impossible."));
			}
		},
		onSuccess: (message) => {
			// Backend returns the soft-deleted Message (isDeleted: true). Upsert preserves it.
			qc.setQueryData<MessagesPages>(messagesKeys.list(message.topicId), (old) => messagesCache.upsertInPages(old, message));
		},
	});
}

export const useMessagesMutations = {
	post: usePost,
	edit: useEdit,
	delete: useDelete,
};
