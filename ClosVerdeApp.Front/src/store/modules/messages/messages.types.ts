import type { Message } from "@apis/rest/api/generated";

export type TopicMessages = {
	messages: Message[];
	cursor?: string;
	hasMore: boolean;
	status: "idle" | "loading" | "ready" | "error";
	error: string | null;
};

export type MessagesState = {
	byTopicId: Record<string, TopicMessages>;
};
