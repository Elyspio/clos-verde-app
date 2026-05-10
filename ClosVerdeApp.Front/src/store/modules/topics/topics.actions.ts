import { createSelector } from "@reduxjs/toolkit";
import type { Topic } from "@apis/rest/api/generated";
import type { TopicsState } from "./topics.types";

export { topicCreated, topicUpdated, topicDeleted } from "./topics.reducer";
export { fetchTopics, createTopic, renameTopic, deleteTopic, markTopicRead } from "./topics.async.actions";

// Memoised so the returned array keeps the same reference between renders unless the underlying state changes.
// Sorted by activity (lastMessageAt, falling back to createdAt) so freshly-active topics float to the top
// without waiting for a full refetch.
export const selectTopics = createSelector(
	(state: { topics: TopicsState }) => state.topics.byId,
	(state: { topics: TopicsState }) => state.topics.allIds,
	(byId, allIds): Topic[] => {
		const list: Topic[] = [];
		for (const id of allIds) {
			const t = byId[id];
			if (t) list.push(t);
		}
		return list.sort((a, b) => {
			const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime();
			const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime();
			return bTime - aTime; // most-recent first
		});
	},
);

export const selectTopicById = (state: { topics: TopicsState }, id: string | undefined) => (id ? state.topics.byId[id] : undefined);

export const selectTopicsStatus = (state: { topics: TopicsState }) => state.topics.listStatus;
