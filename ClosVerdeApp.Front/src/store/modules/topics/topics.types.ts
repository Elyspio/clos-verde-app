import type { Topic } from "@/types/models";

export type TopicsState = {
	byId: Record<string, Topic>;
	allIds: string[];
	listStatus: "idle" | "loading" | "ready" | "error";
	listError: string | null;
};
