import type { Topic, TopicListItem } from "@/types/models";
import { axiosInstance } from "./client";

/** HTTP adapter for the topics REST surface (list with unread counts, CRUD, mark-read). */
export const topicsApi = {
	list: async () => (await axiosInstance.get<TopicListItem[]>(`/api/topics`)).data,
	get: async (id: string) => (await axiosInstance.get<Topic>(`/api/topics/${id}`)).data,
	create: async (name: string) => (await axiosInstance.post<Topic>(`/api/topics`, { name })).data,
	rename: async (id: string, name: string) => (await axiosInstance.put<Topic>(`/api/topics/${id}`, { name })).data,
	remove: async (id: string) => {
		await axiosInstance.delete(`/api/topics/${id}`);
	},
	markRead: async (id: string, at?: string) => (await axiosInstance.post<{ lastReadAt: string }>(`/api/topics/${id}/read`, { at })).data,
};
