import type { UnreadState } from "./unread.types";

export { setCurrentUser, setFocusedTopic, messageCreated, readReceiptUpdated, topicDeleted } from "./unread.reducer";

export const selectUnreadByTopic = (state: { unread: UnreadState }, topicId: string | undefined) => (topicId && state.unread.perTopic[topicId]) || 0;

export const selectUnreadTotal = (state: { unread: UnreadState }) => Object.values(state.unread.perTopic).reduce((sum, n) => sum + n, 0);

export const selectFocusedTopic = (state: { unread: UnreadState }) => state.unread.focusedTopicId;
