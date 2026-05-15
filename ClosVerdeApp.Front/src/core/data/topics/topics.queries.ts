import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Topic, TopicListItem } from "@apis/rest/api/generated";
import { topicsService } from "@/core/services/topics.service";
import { topicsKeys } from "./topics.keys";

/** Most-recently-active topic first; falls back to `createdAt` for topics with no messages. */
const sortByActivity = (items: TopicListItem[]): TopicListItem[] =>
	[...items].sort((a, b) => {
		const aTime = new Date(a.topic.lastMessageAt ?? a.topic.createdAt).getTime();
		const bTime = new Date(b.topic.lastMessageAt ?? b.topic.createdAt).getTime();
		return bTime - aTime;
	});

/**
 * Full list of TopicListItems with unread counts and mute state.
 * Single source of truth for the sidebar — all derived hooks read from this same cache entry.
 */
function useList() {
	return useQuery({
		queryKey: topicsKeys.list(),
		queryFn: () => topicsService.list(),
		select: sortByActivity,
		staleTime: 30_000,
	});
}

/** Flat array of Topic objects derived from the list cache — no extra fetch. */
function useAll(): Topic[] {
	const query = useList();
	return useMemo(() => query.data?.map((item) => item.topic) ?? [], [query.data]);
}

/** Full TopicListItem (with unread/muted) for a given topic id. */
function useByItemId(topicId: string | undefined): TopicListItem | undefined {
	const query = useList();
	if (!topicId) return undefined;
	return query.data?.find((item) => item.topic.id === topicId);
}

/** Just the Topic object for a given id (no unread/muted metadata). */
function useById(topicId: string | undefined): Topic | undefined {
	return useByItemId(topicId)?.topic;
}

/** Whether the current user has muted the given topic. */
function useIsMuted(topicId: string | undefined): boolean {
	return !!useByItemId(topicId)?.isMuted;
}

export const useTopicsQueries = {
	list: useList,
	all: useAll,
	byId: useById,
	details: useByItemId,
	isMuted: useIsMuted,
};
