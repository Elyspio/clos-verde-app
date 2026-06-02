import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Message } from "@apis/rest/api/generated";
import { messagesService } from "@/core/services/messages.service";
import { messagesKeys } from "./messages.keys";
import { messagesCache } from "./messages.cache";

const PAGE_SIZE = 50;

/**
 * Cursor-based infinite query for a topic's message history.
 * "Next page" = older messages; cursor is the `id` of the oldest loaded message — an exact,
 * opaque cursor (message ids embed a sortable ObjectId), so messages sharing the same
 * one-second timestamp can't be duplicated or skipped at page boundaries.
 * `staleTime: 0` — cache is kept current exclusively via SignalR and optimistic mutations.
 */
function useInfinite(topicId: string | undefined) {
	return useInfiniteQuery({
		queryKey: topicId ? messagesKeys.list(topicId) : ["messages", "list", "__none__"],
		queryFn: ({ pageParam }) => messagesService.list(topicId!, pageParam, PAGE_SIZE),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (oldestLoadedPage) => {
			if (oldestLoadedPage.length < PAGE_SIZE) return undefined;
			return oldestLoadedPage[0]?.id;
		},
		enabled: !!topicId,
		staleTime: 0,
		refetchOnWindowFocus: false,
	});
}

/** Flattened, consumer-ready view returned by `useList`. */
export type UseMessagesResult = {
	/** All loaded messages sorted chronologically (oldest → newest). Includes optimistic entries. */
	messages: Message[];
	isLoading: boolean;
	isError: boolean;
	/** True when older pages are available (scroll-up history). */
	hasMore: boolean;
	fetchOlder: () => void;
	isFetchingOlder: boolean;
};

/** Wraps `useInfinite` and flattens pages into a sorted array for rendering. */
function useList(topicId: string | undefined): UseMessagesResult {
	const query = useInfinite(topicId);
	const messages = useMemo(() => messagesCache.flatten(query.data), [query.data]);
	return {
		messages,
		isLoading: query.isPending,
		isError: query.isError,
		hasMore: !!query.hasNextPage,
		fetchOlder: () => void query.fetchNextPage(),
		isFetchingOlder: query.isFetchingNextPage,
	};
}

export const useMessagesQueries = {
	/** Raw infinite query — use when you need direct page params or `fetchNextPage`. */
	infinite: useInfinite,
	/** Preferred for rendering — returns a flat sorted array + pagination controls. */
	list: useList,
};
