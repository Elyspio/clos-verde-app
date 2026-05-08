import type { Message } from "@/types/models";
import type { MessagesState } from "./messages.types";

export { messageCreated, messageUpdated, messageDeleted, topicCleared } from "./messages.reducer";
export { fetchMessages, postMessage, editMessage, deleteMessage } from "./messages.async.actions";

// Stable empty array so selectors return the same reference when there's nothing yet,
// avoiding `useSelector` triggering re-renders on every store update.
const EMPTY_MESSAGES: readonly Message[] = Object.freeze([]);

export const selectMessages = (state: { messages: MessagesState }, topicId: string | undefined): readonly Message[] =>
	(topicId ? state.messages.byTopicId[topicId]?.messages : undefined) ?? EMPTY_MESSAGES;

export const selectMessagesStatus = (state: { messages: MessagesState }, topicId: string | undefined) =>
	(topicId ? state.messages.byTopicId[topicId]?.status : undefined) ?? "idle";

export const selectMessagesHasMore = (state: { messages: MessagesState }, topicId: string | undefined) =>
	(topicId ? state.messages.byTopicId[topicId]?.hasMore : undefined) ?? false;
