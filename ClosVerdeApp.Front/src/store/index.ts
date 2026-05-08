import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { reservationsReducer } from "./modules/reservations/reservations.reducer";
import { topicsReducer } from "./modules/topics/topics.reducer";
import { messagesReducer } from "./modules/messages/messages.reducer";
import { unreadReducer } from "./modules/unread/unread.reducer";
import { usersReducer } from "./modules/users/users.reducer";
import { messageCreated as messagesMessageCreated, topicCleared as messagesTopicCleared } from "./modules/messages/messages.reducer";
import { topicDeleted as topicsTopicDeleted } from "./modules/topics/topics.reducer";
import { messageCreated as unreadMessageCreated, topicDeleted as unreadTopicDeleted } from "./modules/unread/unread.reducer";

// Cross-slice mirror: a single SignalR event must update several slices.
// `messages/messageCreated` → bump per-topic unread.
// `topics/topicDeleted`     → wipe cached messages and unread state for that topic.
const realtimeFanout: Middleware = (api) => (next) => (action) => {
	const result = next(action);
	const a = action as { type?: string; payload?: unknown };
	if (a?.type === messagesMessageCreated.type) {
		api.dispatch(unreadMessageCreated(a.payload as Parameters<typeof unreadMessageCreated>[0]));
	} else if (a?.type === topicsTopicDeleted.type) {
		const topicId = a.payload as string;
		api.dispatch(messagesTopicCleared(topicId));
		api.dispatch(unreadTopicDeleted(topicId));
	}
	return result;
};

const store = configureStore({
	reducer: {
		reservations: reservationsReducer,
		topics: topicsReducer,
		messages: messagesReducer,
		unread: unreadReducer,
		users: usersReducer,
	},
	middleware: (getDefault) => getDefault().concat(realtimeFanout),
	devTools: !import.meta.env.PROD,
});

export type AppStore = typeof store;
export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

export default store;
