export const messagesKeys = {
	/** Root — evict everything with `removeQueries({ queryKey: messagesKeys.all })`. */
	all: ["messages"] as const,

	/**
	 * Paginated message list for a topic.
	 * Prefer `setQueryData` over `invalidateQueries` here — SignalR and optimistic updates
	 * keep it current without triggering a refetch.
	 */
	list: (topicId: string) => [...messagesKeys.all, "list", topicId] as const,
};
