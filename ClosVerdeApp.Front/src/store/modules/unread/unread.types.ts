export type UnreadState = {
	perTopic: Record<string, number>;
	lastReadAt: Record<string, string>;
	currentUserId: string | null;
	focusedTopicId: string | null;
};
