import type { Message } from "@/types/models";
import { axiosInstance } from "./client";

/** HTTP adapter for chat messages (cursor-paginated list, post, edit, soft-delete). */
export const messagesApi = {
	list: async (topicId: string, before?: string, limit = 50) => (await axiosInstance.get<Message[]>(`/api/topics/${topicId}/messages`, { params: { before, limit } })).data,
	post: async (topicId: string, contentHtml: string) => (await axiosInstance.post<Message>(`/api/topics/${topicId}/messages`, { contentHtml })).data,
	edit: async (id: string, contentHtml: string) => (await axiosInstance.put<Message>(`/api/messages/${id}`, { contentHtml })).data,
	remove: async (id: string) => (await axiosInstance.delete<Message>(`/api/messages/${id}`)).data,
};
