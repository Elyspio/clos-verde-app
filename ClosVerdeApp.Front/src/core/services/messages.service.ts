import { backendApi } from "@apis/rest/api/clients/api.client";

export const messagesService = {
	list: async (topicId: string, before?: string, limit = 50) => (await backendApi.topicsListMessages(topicId, before, limit)).data,
	post: async (topicId: string, contentHtml: string, attachmentIds: string[] = []) => (await backendApi.topicsPostMessage(topicId, { contentHtml, attachmentIds })).data,
	edit: async (id: string, contentHtml: string) => (await backendApi.messagesEdit(id, { contentHtml })).data,
	remove: async (id: string) => (await backendApi.messagesDelete(id)).data,
};
