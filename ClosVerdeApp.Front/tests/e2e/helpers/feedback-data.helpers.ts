import type { APIRequestContext } from "@playwright/test";
import type { CreateFeedbackRequest, Feedback, FeedbackCategory } from "../../../src/core/apis/rest/api/generated";

/**
 * Data helpers for the feedback feature. Mirrors `reservation-data.helpers.ts`.
 *
 * NOTE: the feedback API exposes no DELETE endpoint, so created tickets cannot be cleaned up.
 * Tests must therefore use run-id'd titles and assert on relative behaviour (never on absolute counts).
 */

async function parseJson<T>(response: Awaited<ReturnType<APIRequestContext["post"]>>, context: string): Promise<T> {
	if (!response.ok()) {
		throw new Error(`${context} a échoué (${response.status()}) : ${await response.text()}`);
	}
	return (await response.json()) as T;
}

export async function createFeedbackViaApi(request: APIRequestContext, payload: CreateFeedbackRequest): Promise<Feedback> {
	const response = await request.post("/api/feedback", { data: payload });
	return parseJson<Feedback>(response, `La création du feedback « ${payload.title} »`);
}

/** Convenience overload used by most specs: build the request from primitives. */
export async function seedFeedback(request: APIRequestContext, options: { category: FeedbackCategory; title: string; body: string; attachmentIds?: string[] }): Promise<Feedback> {
	return createFeedbackViaApi(request, {
		category: options.category,
		title: options.title,
		body: options.body,
		attachmentIds: options.attachmentIds ?? [],
	});
}

/** Admin posts a reply on a ticket's thread. `adminClient` must be authenticated as an admin. */
export async function addAdminReplyViaApi(adminClient: APIRequestContext, id: string, body: string): Promise<Feedback> {
	const response = await adminClient.post(`/api/feedback/${id}/replies`, { data: { body } });
	return parseJson<Feedback>(response, `L'ajout d'une réponse au feedback ${id}`);
}
