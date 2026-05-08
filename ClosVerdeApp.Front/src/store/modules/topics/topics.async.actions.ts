import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@/core/api/client";
import { topicsApi } from "@/core/api/topics.api";
import type { Topic, TopicListItem } from "@/types/models";

export const fetchTopics = createAsyncThunk<TopicListItem[]>("topics/fetch", async (_, { rejectWithValue }) => {
	try {
		return await topicsApi.list();
	} catch (e) {
		return rejectWithValue(extractApiError(e));
	}
});

export const createTopic = createAsyncThunk<Topic, string>("topics/create", async (name, { rejectWithValue }) => {
	try {
		return await topicsApi.create(name);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Création impossible."));
	}
});

export const renameTopic = createAsyncThunk<Topic, { id: string; name: string }>("topics/rename", async ({ id, name }, { rejectWithValue }) => {
	try {
		return await topicsApi.rename(id, name);
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Renommage impossible."));
	}
});

export const deleteTopic = createAsyncThunk<string, string>("topics/delete", async (id, { rejectWithValue }) => {
	try {
		await topicsApi.remove(id);
		return id;
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Suppression impossible."));
	}
});

export const markTopicRead = createAsyncThunk<{ topicId: string; lastReadAt: string }, { topicId: string; at?: string }>(
	"topics/markRead",
	async ({ topicId, at }, { rejectWithValue }) => {
		try {
			const res = await topicsApi.markRead(topicId, at);
			return { topicId, lastReadAt: res.lastReadAt };
		} catch (e) {
			return rejectWithValue(extractApiError(e));
		}
	},
);
