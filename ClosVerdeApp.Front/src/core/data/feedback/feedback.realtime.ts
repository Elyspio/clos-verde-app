import type { QueryClient } from "@tanstack/react-query";
import type { FeedbackChangedEvent } from "@apis/rest/api/generated";
import { feedbackKeys } from "./feedback.keys";

/**
 * Reacts to admin-hub SignalR events by invalidating the cached admin lists so the
 * back-office reflects new submissions or status changes in near real-time.
 * The hub is server-side gated to admin connections, so non-admins never trigger this.
 */
function onFeedbackChanged(qc: QueryClient, _event: FeedbackChangedEvent) {
	void qc.invalidateQueries({ queryKey: feedbackKeys.adminLists() });
}

export const feedbackRealtime = {
	onFeedbackChanged,
};
