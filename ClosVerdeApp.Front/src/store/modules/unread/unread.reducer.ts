import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Message } from "@apis/rest/api/generated";
import { fetchTopics } from "@/store/modules/topics/topics.actions";
import type { UnreadState } from "./unread.types";

const initialState: UnreadState = {
	perTopic: {},
	lastReadAt: {},
	currentUserId: null,
	focusedTopicId: null,
};

const slice = createSlice({
	name: "unread",
	initialState,
	reducers: {
		setCurrentUser(state, action: PayloadAction<string | null>) {
			state.currentUserId = action.payload;
		},
		setFocusedTopic(state, action: PayloadAction<string | null>) {
			state.focusedTopicId = action.payload;
			if (action.payload) state.perTopic[action.payload] = 0;
		},
		messageCreated(state, action: PayloadAction<Message>) {
			const msg = action.payload;
			if (state.currentUserId && msg.authorUserId === state.currentUserId) return;
			if (msg.isDeleted) return;
			if (msg.topicId === state.focusedTopicId) return;
			state.perTopic[msg.topicId] = (state.perTopic[msg.topicId] ?? 0) + 1;
		},
		readReceiptUpdated(state, action: PayloadAction<{ topicId: string; lastReadAt: string }>) {
			state.lastReadAt[action.payload.topicId] = action.payload.lastReadAt;
			state.perTopic[action.payload.topicId] = 0;
		},
		topicDeleted(state, action: PayloadAction<string>) {
			delete state.perTopic[action.payload];
			delete state.lastReadAt[action.payload];
		},
	},
	extraReducers: (builder) => {
		builder.addCase(fetchTopics.fulfilled, (state, action) => {
			state.perTopic = {};
			state.lastReadAt = {};
			for (const item of action.payload) {
				state.perTopic[item.topic.id] = item.unreadCount;
				if (item.lastReadAt) state.lastReadAt[item.topic.id] = item.lastReadAt;
			}
		});
	},
});

export const { setCurrentUser, setFocusedTopic, messageCreated, readReceiptUpdated, topicDeleted } = slice.actions;
export const unreadReducer = slice.reducer;
