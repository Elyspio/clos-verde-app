import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { startFeedbackHub, stopFeedbackHub } from "@/core/apis/websocket/feedback";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { feedbackRealtime } from "@data/feedback/feedback.realtime";

/**
 * Wires the admin-only feedback SignalR hub to the query cache. No-op when the
 * current user is not an admin — the hub is gated server-side, but skipping the
 * connection entirely avoids a doomed handshake.
 */
export function useFeedbackBridge(enabled: boolean) {
	const qc = useQueryClient();
	const isAdmin = useIsAdmin();

	useEffect(() => {
		if (!enabled || !isAdmin) return;

		void startFeedbackHub({
			onFeedbackChanged: (event) => feedbackRealtime.onFeedbackChanged(qc, event),
		});

		return () => {
			void stopFeedbackHub();
		};
	}, [enabled, isAdmin, qc]);
}
