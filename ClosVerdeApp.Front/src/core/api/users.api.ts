import type { DirectoryUser } from "@/types/models";
import { axiosInstance } from "./client";

/** HTTP adapter for the realm user directory (mention candidates). */
export const usersApi = {
	list: async () => (await axiosInstance.get<DirectoryUser[]>(`/api/users`)).data,
};
