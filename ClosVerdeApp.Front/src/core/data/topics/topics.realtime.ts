import type { QueryClient } from "@tanstack/react-query";
import type { Topic, TopicChangedEvent, TopicListItem } from "@apis/rest/api/generated";
import { messagesKeys } from "@data/messages/messages.keys";
import { topicsKeys } from "./topics.keys";

function upsertTopicListItem(items: TopicListItem[] | undefined, topic: Topic): TopicListItem[] | undefined {
	if (!items) return items;
	const idx = items.findIndex((item) => item.topic.id === topic.id);
	if (idx >= 0) {
		const next = [...items];
		next[idx] = { ...next[idx], topic };
		return next;
	}
	return [...items, { topic, unreadCount: 0, isMuted: false, lastReadAt: null }];
}

function removeTopicListItem(items: TopicListItem[] | undefined, topicId: string): TopicListItem[] | undefined {
	if (!items) return items;
	return items.filter((item) => item.topic.id !== topicId);
}

/**
 * Handles `TopicChanged` from SignalR.
 * Created/Updated → upserts into list cache.
 * Deleted → removes from list, evicts messages cache, invalidates engaged.
 */
function onTopicChanged(qc: QueryClient, event: TopicChangedEvent) {
	switch (event.action) {
		case "Created":
		case "Updated":
			if (event.topic) {
				qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => upsertTopicListItem(old, event.topic!));
			}
			return;
		case "Deleted":
			if (event.topicId) {
				qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => removeTopicListItem(old, event.topicId!));
				qc.removeQueries({ queryKey: messagesKeys.list(event.topicId), exact: true });
				void qc.invalidateQueries({ queryKey: topicsKeys.engaged() });
			}
			return;
	}
}

/**
 * Handles `ReadReceiptUpdated` from SignalR (read from another tab/device).
 * Sets `unreadCount = 0` and updates `lastReadAt` on the matching list item.
 */
function onReadReceiptUpdated(qc: QueryClient, payload: { topicId: string; lastReadAt: string }) {
	qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) =>
		old?.map((item) => (item.topic.id === payload.topicId ? { ...item, lastReadAt: payload.lastReadAt, unreadCount: 0 } : item)),
	);
}

export const topicsRealtime = {
	onTopicChanged,
	onReadReceiptUpdated,
};
