import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { topicsService } from "@/core/services/topics.service";
import type { Topic, TopicListItem } from "@apis/rest/api/generated";

export const fetchTopics = createAsyncThunk<TopicListItem[]>("topics/fetch", async (_, { rejectWithValue }) => {
	try {
		return await topicsService.list();
	} catch (e) {
		return rejectWithValue(extractApiError(e));
	}
});

export const createTopic = createAsyncThunk<Topic, string>("topics/create", async (name, { rejectWithValue }) => {
	try {
		return await topicsService.create(name);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Création impossible."));
	}
});

export const renameTopic = createAsyncThunk<Topic, { id: string; name: string }>("topics/rename", async ({ id, name }, { rejectWithValue }) => {
	try {
		return await topicsService.rename(id, name);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Renommage impossible."));
	}
});

export const deleteTopic = createAsyncThunk<string, string>("topics/delete", async (id, { rejectWithValue }) => {
	try {
		await topicsService.remove(id);
		return id;
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Suppression impossible."));
	}
});

export const markTopicRead = createAsyncThunk<void, { topicId: string; at?: string }>("topics/markRead", async ({ topicId, at }, { rejectWithValue }) => {
	try {
		await topicsService.markRead(topicId, at);
	} catch (e) {
		return rejectWithValue(extractApiError(e));
	}
});
