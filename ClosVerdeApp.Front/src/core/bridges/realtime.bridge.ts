import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { startMessagesHub, stopMessagesHub } from "@/core/apis/websocket/messages";
import { startReservationsHub, stopReservationsHub } from "@/core/apis/websocket/reservations";
import { useCurrentUserId } from "@data/client/useCurrentUserId";
import { messagesRealtime } from "@data/messages/messages.realtime";
import { notificationsSideEffects } from "@data/notifications/notifications.sideEffects";
import { reservationsRealtime } from "@data/reservations/reservations.realtime";
import { topicsRealtime } from "@data/topics/topics.realtime";

/**
 * Wires the SignalR hubs to the TanStack Query cache. Call once from an auth-protected layout.
 *
 * Order matters inside onMessageChanged.Created:
 * 1. messagesRealtime.onMessageChanged — the message lands in its topic's paginated cache.
 * 2. messagesRealtime.onUnreadFromCreated — bumps the topic list's unread count (reads focusedTopicId).
 * 3. notificationsSideEffects.maybeNotify — desktop notification (reads focusedTopicId + topics list cache).
 */
export function useRealtimeBridge(enabled: boolean) {
	const qc = useQueryClient();
	const currentUserId = useCurrentUserId();

	useEffect(() => {
		if (!enabled) return;

		void startMessagesHub({
			onTopicChanged: (event) => topicsRealtime.onTopicChanged(qc, event),
			onMessageChanged: (event) => {
				messagesRealtime.onMessageChanged(qc, event);
				if (event.action === "Created" && event.message) {
					messagesRealtime.onUnreadFromCreated(qc, event.message, currentUserId);
					notificationsSideEffects.maybeNotify(qc, event.message, currentUserId);
				}
			},
			onReadReceiptUpdated: (topicId, lastReadAt) => topicsRealtime.onReadReceiptUpdated(qc, { topicId, lastReadAt }),
		});

		void startReservationsHub({
			onReservationChanged: (event) => {
				reservationsRealtime.onReservationChanged(qc, event);
				if (event.action === "Created") notificationsSideEffects.maybeNotifyReservation(event.reservation, currentUserId);
			},
		});

		return () => {
			void stopMessagesHub();
			void stopReservationsHub();
		};
	}, [enabled, qc, currentUserId]);
}
