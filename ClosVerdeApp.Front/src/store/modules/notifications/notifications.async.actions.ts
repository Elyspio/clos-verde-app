import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { topicsService } from "@/core/services/topics.service";

export const fetchEngagedTopics = createAsyncThunk<string[]>("notifications/fetchEngaged", async (_, { rejectWithValue }) => {
	try {
		return await topicsService.listEngaged();
	} catch (e) {
		return rejectWithValue(extractApiError(e));
	}
});

export const muteTopic = createAsyncThunk<string, string>("notifications/mute", async (topicId, { rejectWithValue }) => {
	try {
		await topicsService.mute(topicId);
		return topicId;
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Mise en sourdine impossible."));
	}
});

export const unmuteTopic = createAsyncThunk<string, string>("notifications/unmute", async (topicId, { rejectWithValue }) => {
	try {
		await topicsService.unmute(topicId);
		return topicId;
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Réactivation impossible."));
	}
});
