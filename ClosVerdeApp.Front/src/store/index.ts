import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { reservationsReducer } from "./modules/reservations/reservations.reducer";
import { topicsReducer } from "./modules/topics/topics.reducer";
import { messagesReducer } from "./modules/messages/messages.reducer";
import { unreadReducer } from "./modules/unread/unread.reducer";
import { usersReducer } from "./modules/users/users.reducer";
import { notificationsReducer } from "./modules/notifications/notifications.reducer";
import { messageCreated as messagesMessageCreated, topicCleared as messagesTopicCleared } from "./modules/messages/messages.reducer";
import { topicDeleted as topicsTopicDeleted } from "./modules/topics/topics.reducer";
import { reservationCreated as reservationsReservationCreated } from "./modules/reservations/reservations.reducer";
import { messageCreated as unreadMessageCreated, topicDeleted as unreadTopicDeleted } from "./modules/unread/unread.reducer";
import { maybeNotify, maybeNotifyReservation } from "@/core/notifications/notifications";
import type { Message, Reservation } from "@apis/rest/api/generated";

// Cross-slice mirror: a single SignalR event must update several slices.
// `messages/messageCreated` → bump per-topic unread + maybe ring a desktop notification.
// `topics/topicDeleted`     → wipe cached messages and unread state for that topic.
const realtimeFanout: Middleware = (api) => (next) => (action) => {
	const result = next(action);
	const a = action as { type?: string; payload?: unknown };
	if (a?.type === messagesMessageCreated.type) {
		const payload = a.payload as Message;
		api.dispatch(unreadMessageCreated(payload));
		// Notification side-effect after state has settled, so the rule reads up-to-date Redux.
		maybeNotify(payload);
	} else if (a?.type === reservationsReservationCreated.type) {
		maybeNotifyReservation(a.payload as Reservation);
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
		notifications: notificationsReducer,
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
