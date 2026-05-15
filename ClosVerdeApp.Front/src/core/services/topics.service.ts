import { backendApi } from "@apis/rest/api/clients/api.client";

export const topicsService = {
	list: async () => (await backendApi.topicsList()).data,
	get: async (id: string) => (await backendApi.topicsGet(id)).data,
	create: async (name: string) => (await backendApi.topicsCreate({ name })).data,
	rename: async (id: string, name: string) => (await backendApi.topicsRename(id, { name })).data,
	remove: async (id: string) => {
		await backendApi.topicsDelete(id);
	},
	markRead: async (id: string, at?: string) => {
		await backendApi.topicsMarkRead(id, { at });
	},
	listEngaged: async () => (await backendApi.topicsListEngaged()).data,
	mute: async (id: string) => {
		await backendApi.topicsMute(id);
	},
	unmute: async (id: string) => {
		await backendApi.topicsUnmute(id);
	},
};
