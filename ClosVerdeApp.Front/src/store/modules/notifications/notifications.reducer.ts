import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { fetchTopics } from "@/store/modules/topics/topics.actions";
import { fetchEngagedTopics, muteTopic, unmuteTopic } from "./notifications.async.actions";
import type { NotificationsState } from "./notifications.types";

const initialPermission: NotificationsState["permission"] = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

const initialState: NotificationsState = {
	mutedTopicIds: [],
	engagedTopicIds: [],
	permission: initialPermission,
	pushStatus: "idle",
	pushError: null,
};

const slice = createSlice({
	name: "notifications",
	initialState,
	reducers: {
		permissionChanged(state, action: PayloadAction<NotificationsState["permission"]>) {
			state.permission = action.payload;
		},
		pushStatusChanged(state, action: PayloadAction<{ status: NotificationsState["pushStatus"]; error?: string | null }>) {
			state.pushStatus = action.payload.status;
			state.pushError = action.payload.error ?? null;
		},
		topicEngaged(state, action: PayloadAction<string>) {
			if (!state.engagedTopicIds.includes(action.payload)) state.engagedTopicIds.push(action.payload);
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTopics.fulfilled, (state, action) => {
				state.mutedTopicIds = action.payload.filter((i) => i.isMuted).map((i) => i.topic.id);
			})
			.addCase(fetchEngagedTopics.fulfilled, (state, action) => {
				state.engagedTopicIds = action.payload;
			})
			.addCase(muteTopic.fulfilled, (state, action) => {
				if (!state.mutedTopicIds.includes(action.payload)) state.mutedTopicIds.push(action.payload);
			})
			.addCase(unmuteTopic.fulfilled, (state, action) => {
				state.mutedTopicIds = state.mutedTopicIds.filter((id) => id !== action.payload);
			});
	},
});

export const { permissionChanged, pushStatusChanged, topicEngaged } = slice.actions;
export const notificationsReducer = slice.reducer;
