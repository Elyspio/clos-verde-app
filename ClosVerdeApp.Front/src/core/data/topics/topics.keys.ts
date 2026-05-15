export const topicsKeys = {
	/** Root — invalidate to wipe the entire topics cache. */
	all: ["topics"] as const,

	/** Sidebar list of TopicListItems (includes unread counts + isMuted). Kept fresh via SignalR patches. */
	list: () => [...topicsKeys.all, "list"] as const,

	/** Single-topic detail — reserved for future standalone fetches; currently derived from the list cache. */
	detail: (id: string) => [...topicsKeys.all, "detail", id] as const,

	/** Topics the current user has participated in — used for push-notification targeting. */
	engaged: () => [...topicsKeys.all, "engaged"] as const,
};
