import type { DirectoryUser } from "@apis/rest/api/generated";

export type UsersState = {
	byId: Record<string, DirectoryUser>;
	allIds: string[];
	status: "idle" | "loading" | "ready" | "error";
	error: string | null;
};
