import { backendApi } from "@apis/rest/api/clients/api.client";
import type { CreateFeedbackRequest, FeedbackCategory, FeedbackStatus, UpdateFeedbackStatusRequest } from "@apis/rest/api/generated";

export const feedbackService = {
	create: async (request: CreateFeedbackRequest) => (await backendApi.feedbackCreate(request)).data,
	list: async (category?: FeedbackCategory, status?: FeedbackStatus, page = 1, pageSize = 20) => (await backendApi.feedbackList(category, status, page, pageSize)).data,
	listMine: async (status?: FeedbackStatus[], page = 1, pageSize = 20) => (await backendApi.feedbackListMine(status, page, pageSize)).data,
	getById: async (id: string) => (await backendApi.feedbackGetById(id)).data,
	closeMine: async (id: string) => (await backendApi.feedbackCloseMine(id)).data,
	updateStatus: async (id: string, request: UpdateFeedbackStatusRequest) => (await backendApi.feedbackUpdateStatus(id, request)).data,
};
