import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import type { Topic, TopicListItem } from "@apis/rest/api/generated";
import { topicsService } from "@/core/services/topics.service";
import { messagesKeys } from "@data/messages/messages.keys";
import { topicsKeys } from "./topics.keys";

// ---------------------------------------------------------------------------
// Internal cache helpers
// ---------------------------------------------------------------------------

function patchListItemFor(qc: QueryClient, topicId: string, patch: (item: TopicListItem) => TopicListItem) {
	qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => (old ? old.map((item) => (item.topic.id === topicId ? patch(item) : item)) : old));
}

function removeListItem(qc: QueryClient, topicId: string) {
	qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => (old ? old.filter((item) => item.topic.id !== topicId) : old));
}

/** Insert or update a Topic in the list cache; creates a default envelope on first appearance. */
function upsertTopic(qc: QueryClient, topic: Topic) {
	qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => {
		if (!old) return old;
		const idx = old.findIndex((item) => item.topic.id === topic.id);
		if (idx >= 0) {
			const next = [...old];
			next[idx] = { ...next[idx], topic };
			return next;
		}
		return [...old, { topic, unreadCount: 0, isMuted: false, lastReadAt: null }];
	});
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Creates a Custom topic. Cache: upserts the new item into the sidebar list. */
function useCreate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (name: string) => {
			try {
				return await topicsService.create(name);
			} catch (e) {
				throw new Error(extractApiError(e, "Création impossible."));
			}
		},
		onSuccess: (topic) => upsertTopic(qc, topic),
	});
}

/** Renames a Custom topic. Cache: upserts the updated Topic into the sidebar list. */
function useRename() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, name }: { id: string; name: string }) => {
			try {
				return await topicsService.rename(id, name);
			} catch (e) {
				throw new Error(extractApiError(e, "Renommage impossible."));
			}
		},
		onSuccess: (topic) => upsertTopic(qc, topic),
	});
}

/** Deletes a Custom topic. Cache: removes from list, evicts messages cache, invalidates engaged. */
function useDelete() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			try {
				await topicsService.remove(id);
				return id;
			} catch (e) {
				throw new Error(extractApiError(e, "Suppression impossible."));
			}
		},
		onSuccess: (id) => {
			removeListItem(qc, id);
			qc.removeQueries({ queryKey: messagesKeys.list(id), exact: true });
			void qc.invalidateQueries({ queryKey: topicsKeys.engaged() });
		},
	});
}

/**
 * Marks all messages as read up to `at`.
 * Cache: sets `unreadCount = 0` and updates `lastReadAt` on the list item immediately.
 */
function useMarkRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ topicId, at }: { topicId: string; at?: string }) => {
			await topicsService.markRead(topicId, at);
			return { topicId, at };
		},
		onSuccess: ({ topicId, at }) => {
			patchListItemFor(qc, topicId, (item) => ({
				...item,
				unreadCount: 0,
				lastReadAt: at ?? item.lastReadAt ?? new Date().toISOString(),
			}));
		},
	});
}

/** Mutes a topic (no desktop notifications). Cache: sets `isMuted = true` on the list item. */
function useMute() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (topicId: string) => {
			try {
				await topicsService.mute(topicId);
				return topicId;
			} catch (e) {
				throw new Error(extractApiError(e, "Mise en sourdine impossible."));
			}
		},
		onSuccess: (topicId) => patchListItemFor(qc, topicId, (item) => ({ ...item, isMuted: true })),
	});
}

/** Unmutes a topic. Cache: sets `isMuted = false` on the list item. */
function useUnmute() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (topicId: string) => {
			try {
				await topicsService.unmute(topicId);
				return topicId;
			} catch (e) {
				throw new Error(extractApiError(e, "Réactivation impossible."));
			}
		},
		onSuccess: (topicId) => patchListItemFor(qc, topicId, (item) => ({ ...item, isMuted: false })),
	});
}

export const useTopicsMutations = {
	create: useCreate,
	rename: useRename,
	delete: useDelete,
	markRead: useMarkRead,
	mute: useMute,
	unmute: useUnmute,
};
