import type { Topic } from "@apis/rest/api/generated";

export type TopicsState = {
	byId: Record<string, Topic>;
	allIds: string[];
	listStatus: "idle" | "loading" | "ready" | "error";
	listError: string | null;
};
