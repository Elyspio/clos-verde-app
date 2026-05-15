import type { QueryClient } from "@tanstack/react-query";
import type { Message, MessageChangedEvent, TopicListItem } from "@apis/rest/api/generated";
import { useClientStore } from "@data/client/clientStore";
import { topicsKeys } from "@data/topics/topics.keys";
import { messagesKeys } from "./messages.keys";
import { messagesCache, type MessagesPages } from "./messages.cache";

/**
 * Handles `MessageChanged` from SignalR.
 * Created/Updated → upserts into paginated cache; Created also invalidates the topic list
 * so `lastMessageAt` stays accurate.
 * Deleted → hard-removes the row from the cache.
 */
function onMessageChanged(qc: QueryClient, event: MessageChangedEvent) {
	switch (event.action) {
		case "Created":
		case "Updated":
			if (event.message) {
				qc.setQueryData<MessagesPages>(messagesKeys.list(event.message.topicId), (old) => messagesCache.upsertInPages(old, event.message!));
				// keep the topic list's lastMessageAt/messageCount fresh — invalidate is cheap, server is the source of truth.
				if (event.action === "Created") void qc.invalidateQueries({ queryKey: topicsKeys.list() });
			}
			return;
		case "Deleted":
			if (event.topicId && event.messageId) {
				qc.setQueryData<MessagesPages>(messagesKeys.list(event.topicId), (old) => messagesCache.removeFromPages(old, event.messageId!));
			}
			return;
	}
}

/**
 * Bumps `unreadCount` on a TopicListItem when a message arrives from another user,
 * unless the topic is currently focused or the message is from the current user.
 * Call this after `onMessageChanged` for Created events only.
 */
function onUnreadFromCreated(qc: QueryClient, message: Message, currentUserId: string | null) {
	const focusedTopicId = useClientStore.getState().focusedTopicId;
	qc.setQueryData<TopicListItem[]>(topicsKeys.list(), (old) => {
		if (!old) return old;
		return old.map((item) => {
			if (item.topic.id !== message.topicId) return item;
			if (currentUserId && message.authorUserId === currentUserId) return item;
			if (message.isDeleted) return item;
			if (message.topicId === focusedTopicId) return item;
			return { ...item, unreadCount: item.unreadCount + 1 };
		});
	});
}

export const messagesRealtime = {
	onMessageChanged,
	onUnreadFromCreated,
};
