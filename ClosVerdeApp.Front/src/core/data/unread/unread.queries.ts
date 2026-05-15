import { useQuery } from "@tanstack/react-query";
import type { TopicListItem } from "@apis/rest/api/generated";
import { topicsService } from "@/core/services/topics.service";
import { topicsKeys } from "@data/topics/topics.keys";

/**
 * Unread counts are derived from the topics list cache via `select` — no separate server request.
 * TanStack Query memoizes the selector result, so unrelated cache patches don't re-render consumers.
 */

/** Unread count for a single topic. Returns 0 while loading or if the topic is not found. */
function useByTopic(topicId: string | undefined): number {
	const { data } = useQuery({
		queryKey: topicsKeys.list(),
		queryFn: () => topicsService.list(),
		select: (items: TopicListItem[]) => (topicId ? (items.find((i) => i.topic.id === topicId)?.unreadCount ?? 0) : 0),
		enabled: !!topicId,
		staleTime: 30_000,
	});
	return data ?? 0;
}

/** Total unread count across all topics — drives the nav badge in AppShell. */
function useTotal(): number {
	const { data } = useQuery({
		queryKey: topicsKeys.list(),
		queryFn: () => topicsService.list(),
		select: (items: TopicListItem[]) => items.reduce((sum, i) => sum + i.unreadCount, 0),
		staleTime: 30_000,
	});
	return data ?? 0;
}

export const useUnreadQueries = {
	byTopic: useByTopic,
	total: useTotal,
};
