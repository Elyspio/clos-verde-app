import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Topic } from "@apis/rest/api/generated";
import { createTopic, deleteTopic, fetchTopics, renameTopic } from "./topics.async.actions";
import type { TopicsState } from "./topics.types";

const initialState: TopicsState = {
	byId: {},
	allIds: [],
	listStatus: "idle",
	listError: null,
};

function upsert(state: TopicsState, topic: Topic) {
	state.byId[topic.id] = topic;
	if (!state.allIds.includes(topic.id)) state.allIds.push(topic.id);
}

function remove(state: TopicsState, id: string) {
	delete state.byId[id];
	state.allIds = state.allIds.filter((x) => x !== id);
}

const slice = createSlice({
	name: "topics",
	initialState,
	reducers: {
		topicCreated(state, action: PayloadAction<Topic>) {
			upsert(state, action.payload);
		},
		topicUpdated(state, action: PayloadAction<Topic>) {
			upsert(state, action.payload);
		},
		topicDeleted(state, action: PayloadAction<string>) {
			remove(state, action.payload);
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTopics.pending, (state) => {
				state.listStatus = "loading";
				state.listError = null;
			})
			.addCase(fetchTopics.fulfilled, (state, action) => {
				state.listStatus = "ready";
				state.byId = {};
				state.allIds = [];
				for (const item of action.payload) upsert(state, item.topic);
			})
			.addCase(fetchTopics.rejected, (state, action) => {
				state.listStatus = "error";
				state.listError = (action.payload as string) ?? "Chargement impossible.";
			})
			.addCase(createTopic.fulfilled, (state, action) => {
				upsert(state, action.payload);
			})
			.addCase(renameTopic.fulfilled, (state, action) => {
				upsert(state, action.payload);
			})
			.addCase(deleteTopic.fulfilled, (state, action) => {
				remove(state, action.payload);
			});
	},
});

export const { topicCreated, topicUpdated, topicDeleted } = slice.actions;
export const topicsReducer = slice.reducer;
