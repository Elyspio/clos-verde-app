import type { DirectoryUser } from "@/types/models";

export type UsersState = {
	byId: Record<string, DirectoryUser>;
	allIds: string[];
	status: "idle" | "loading" | "ready" | "error";
	error: string | null;
};
