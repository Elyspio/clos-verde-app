import { backendApi } from "@apis/rest/api/clients/api.client";

export const usersService = {
	list: async () => (await backendApi.usersList()).data,
};
