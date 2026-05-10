import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Message } from "@apis/rest/api/generated";
import { deleteMessage, editMessage, fetchMessages, postMessage } from "./messages.async.actions";
import type { MessagesState, TopicMessages } from "./messages.types";

const emptyTopic = (): TopicMessages => ({
	messages: [],
	hasMore: true,
	status: "idle",
	error: null,
});

const initialState: MessagesState = {
	byTopicId: {},
};

function ensure(state: MessagesState, topicId: string): TopicMessages {
	if (!state.byTopicId[topicId]) state.byTopicId[topicId] = emptyTopic();
	return state.byTopicId[topicId];
}

function upsertMessage(slot: TopicMessages, message: Message) {
	const idx = slot.messages.findIndex((m) => m.id === message.id);
	if (idx >= 0) slot.messages[idx] = message;
	else {
		slot.messages.push(message);
		slot.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}
}

const slice = createSlice({
	name: "messages",
	initialState,
	reducers: {
		messageCreated(state, action: PayloadAction<Message>) {
			const slot = ensure(state, action.payload.topicId);
			upsertMessage(slot, action.payload);
		},
		messageUpdated(state, action: PayloadAction<Message>) {
			const slot = ensure(state, action.payload.topicId);
			upsertMessage(slot, action.payload);
		},
		messageDeleted(state, action: PayloadAction<{ topicId: string; messageId: string }>) {
			const slot = state.byTopicId[action.payload.topicId];
			if (!slot) return;
			slot.messages = slot.messages.filter((m) => m.id !== action.payload.messageId);
		},
		/** Drops cached messages for a topic. Triggered by the cross-slice middleware on <c>topics/topicDeleted</c>. */
		topicCleared(state, action: PayloadAction<string>) {
			delete state.byTopicId[action.payload];
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchMessages.pending, (state, action) => {
				const slot = ensure(state, action.meta.arg.topicId);
				slot.status = "loading";
				slot.error = null;
			})
			.addCase(fetchMessages.fulfilled, (state, action) => {
				const slot = ensure(state, action.payload.topicId);
				slot.status = "ready";
				const incoming = action.payload.messages;
				if (action.payload.before) {
					// prepend older messages
					const existingIds = new Set(slot.messages.map((m) => m.id));
					const merged = [...incoming.filter((m) => !existingIds.has(m.id)), ...slot.messages];
					slot.messages = merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
					slot.hasMore = incoming.length > 0;
				} else {
					slot.messages = incoming;
					slot.hasMore = incoming.length === (action.meta.arg.limit ?? 50);
				}
				slot.cursor = slot.messages[0]?.createdAt;
			})
			.addCase(fetchMessages.rejected, (state, action) => {
				const slot = ensure(state, action.meta.arg.topicId);
				slot.status = "error";
				slot.error = (action.payload as string) ?? "Chargement impossible.";
			})
			.addCase(postMessage.fulfilled, (state, action) => {
				const slot = ensure(state, action.payload.topicId);
				upsertMessage(slot, action.payload);
			})
			.addCase(editMessage.fulfilled, (state, action) => {
				const slot = ensure(state, action.payload.topicId);
				upsertMessage(slot, action.payload);
			})
			.addCase(deleteMessage.fulfilled, (state, action) => {
				const slot = ensure(state, action.payload.topicId);
				upsertMessage(slot, action.payload);
			});
	},
});

export const { messageCreated, messageUpdated, messageDeleted, topicCleared } = slice.actions;
export const messagesReducer = slice.reducer;
