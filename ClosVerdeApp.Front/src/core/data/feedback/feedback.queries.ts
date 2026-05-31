import { useQuery } from "@tanstack/react-query";
import type { FeedbackCategory, FeedbackStatus } from "@apis/rest/api/generated";
import { feedbackService } from "@/core/services/feedback.service";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { feedbackKeys } from "./feedback.keys";

/**
 * Admin paginated list. Only fires when the current user has the `admin` role —
 * non-admins keep an idle query state and never hit the 403-protected endpoint.
 */
function useAdminList(params: { category?: FeedbackCategory; status?: FeedbackStatus; page?: number; pageSize?: number }) {
	const isAdmin = useIsAdmin();
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 20;
	return useQuery({
		queryKey: feedbackKeys.adminList(params.category, params.status, page, pageSize),
		queryFn: () => feedbackService.list(params.category, params.status, page, pageSize),
		enabled: isAdmin,
		staleTime: 15_000,
	});
}

function useMine(params: { status?: FeedbackStatus[]; page?: number; pageSize?: number } = {}) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 20;
	return useQuery({
		queryKey: feedbackKeys.mineList(params.status, page, pageSize),
		queryFn: () => feedbackService.listMine(params.status, page, pageSize),
		staleTime: 15_000,
	});
}

export const useFeedbackQueries = {
	adminList: useAdminList,
	mine: useMine,
};
