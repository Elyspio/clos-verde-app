import type { APIRequestContext } from "@playwright/test";

export type Topic = {
	id: string;
	kind: "Global" | "Custom" | "Reservation";
	name: string;
	createdByUserId?: string | null;
	createdByDisplayName?: string | null;
	reservationId?: string | null;
	createdAt: string;
	updatedAt: string;
	lastMessageAt?: string | null;
	messageCount: number;
};

export type Message = {
	id: string;
	topicId: string;
	authorUserId: string;
	authorDisplayName: string;
	contentHtml: string;
	mentions: string[];
	createdAt: string;
	editedAt?: string | null;
	isDeleted: boolean;
	isSystem: boolean;
};

export type TopicListItem = {
	topic: Topic;
	unreadCount: number;
	lastReadAt?: string | null;
};

async function parseJson<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>, context: string): Promise<T> {
	if (!response.ok()) {
		throw new Error(`${context} a échoué (${response.status()}) : ${await response.text()}`);
	}
	return (await response.json()) as T;
}

export async function listTopics(request: APIRequestContext): Promise<TopicListItem[]> {
	const response = await request.get("/api/topics");
	return parseJson<TopicListItem[]>(response, "Le chargement des topics");
}

export async function createTopicViaApi(request: APIRequestContext, name: string): Promise<Topic> {
	const response = await request.post("/api/topics", { data: { name } });
	return parseJson<Topic>(response, `La création du topic « ${name} »`);
}

export async function deleteTopicViaApi(request: APIRequestContext, id: string): Promise<void> {
	const response = await request.delete(`/api/topics/${id}`);
	if (response.status() === 404) return;
	if (!response.ok()) {
		throw new Error(`La suppression du topic ${id} a échoué (${response.status()}) : ${await response.text()}`);
	}
}

export async function postMessageViaApi(request: APIRequestContext, topicId: string, contentHtml: string): Promise<Message> {
	const response = await request.post(`/api/topics/${topicId}/messages`, { data: { contentHtml } });
	return parseJson<Message>(response, "L'envoi du message");
}

export async function listMessages(request: APIRequestContext, topicId: string): Promise<Message[]> {
	const response = await request.get(`/api/topics/${topicId}/messages`);
	return parseJson<Message[]>(response, `Le chargement des messages du topic ${topicId}`);
}

export async function cleanupTopics(request: APIRequestContext, ids: string[]): Promise<void> {
	const unique = [...new Set(ids.filter(Boolean))];
	const failures: string[] = [];
	for (const id of unique) {
		const response = await request.delete(`/api/topics/${id}`);
		if (response.status() === 404 || response.ok()) continue;
		failures.push(`${id} (${response.status()}) ${await response.text()}`);
	}
	if (failures.length > 0) {
		throw new Error(`Le nettoyage des topics E2E a échoué : ${failures.join(" | ")}`);
	}
}
