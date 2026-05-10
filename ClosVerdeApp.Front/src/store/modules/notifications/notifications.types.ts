/** Per-user notification routing state: which topics are muted, which the user is engaged with. */
export type NotificationsState = {
	mutedTopicIds: string[];
	engagedTopicIds: string[];
	permission: NotificationPermission | "unsupported" | "unknown";
	pushStatus: "unsupported" | "idle" | "subscribing" | "subscribed" | "error";
	pushError: string | null;
};
