import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { messagesService } from "@/core/services/messages.service";
import type { Message } from "@apis/rest/api/generated";

export const fetchMessages = createAsyncThunk<{ topicId: string; messages: Message[]; before?: string }, { topicId: string; before?: string; limit?: number }>(
	"messages/fetch",
	async ({ topicId, before, limit }, { rejectWithValue }) => {
		try {
			const messages = await messagesService.list(topicId, before, limit);
			return { topicId, messages, before };
		} catch (e) {
			return rejectWithValue(extractApiError(e));
		}
	},
);

export const postMessage = createAsyncThunk<Message, { topicId: string; contentHtml: string }>("messages/post", async ({ topicId, contentHtml }, { rejectWithValue }) => {
	try {
		return await messagesService.post(topicId, contentHtml);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Envoi impossible."));
	}
});

export const editMessage = createAsyncThunk<Message, { id: string; contentHtml: string }>("messages/edit", async ({ id, contentHtml }, { rejectWithValue }) => {
	try {
		return await messagesService.edit(id, contentHtml);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Modification impossible."));
	}
});

export const deleteMessage = createAsyncThunk<Message, string>("messages/delete", async (id, { rejectWithValue }) => {
	try {
		return await messagesService.remove(id);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Suppression impossible."));
	}
});
