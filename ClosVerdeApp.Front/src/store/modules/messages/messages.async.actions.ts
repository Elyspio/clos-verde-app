import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@/core/api/client";
import { messagesApi } from "@/core/api/messages.api";
import type { Message } from "@/types/models";

export const fetchMessages = createAsyncThunk<{ topicId: string; messages: Message[]; before?: string }, { topicId: string; before?: string; limit?: number }>(
	"messages/fetch",
	async ({ topicId, before, limit }, { rejectWithValue }) => {
		try {
			const messages = await messagesApi.list(topicId, before, limit);
			return { topicId, messages, before };
		} catch (e) {
			return rejectWithValue(extractApiError(e));
		}
	},
);

export const postMessage = createAsyncThunk<Message, { topicId: string; contentHtml: string }>("messages/post", async ({ topicId, contentHtml }, { rejectWithValue }) => {
	try {
		return await messagesApi.post(topicId, contentHtml);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Envoi impossible."));
	}
});

export const editMessage = createAsyncThunk<Message, { id: string; contentHtml: string }>("messages/edit", async ({ id, contentHtml }, { rejectWithValue }) => {
	try {
		return await messagesApi.edit(id, contentHtml);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Modification impossible."));
	}
});

export const deleteMessage = createAsyncThunk<Message, string>("messages/delete", async (id, { rejectWithValue }) => {
	try {
		return await messagesApi.remove(id);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Suppression impossible."));
	}
});
