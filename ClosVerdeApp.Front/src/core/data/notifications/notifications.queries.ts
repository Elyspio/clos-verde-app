import { useQuery } from "@tanstack/react-query";
import { topicsService } from "@/core/services/topics.service";
import { topicsKeys } from "@data/topics/topics.keys";

/**
 * Topics the current user has participated in (at least one message posted).
 * Used for push-notification targeting. Invalidated after first post in a topic and on topic delete.
 */
function useEngaged() {
	return useQuery({
		queryKey: topicsKeys.engaged(),
		queryFn: () => topicsService.listEngaged(),
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export const useNotificationsQueries = {
	engaged: useEngaged,
};
