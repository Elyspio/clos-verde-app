import type { FeedbackCategory, FeedbackStatus } from "@apis/rest/api/generated";

export const feedbackKeys = {
	all: ["feedback"] as const,

	/** Admin paginated list with filters. */
	adminList: (category: FeedbackCategory | undefined, status: FeedbackStatus | undefined, page: number, pageSize: number) =>
		[...feedbackKeys.all, "admin", { category: category ?? null, status: status ?? null, page, pageSize }] as const,

	/** Convenience root key for invalidating every admin list at once. */
	adminLists: () => [...feedbackKeys.all, "admin"] as const,

	/** Single feedback detail (admin view). */
	detail: (id: string) => [...feedbackKeys.all, "detail", id] as const,

	/** Current user's own feedback lists. */
	mine: () => [...feedbackKeys.all, "mine"] as const,

	/** Current user's paginated feedback list with filters. */
	mineList: (status: FeedbackStatus[] | undefined, page: number, pageSize: number) => [...feedbackKeys.mine(), { status: status ?? null, page, pageSize }] as const,
};
