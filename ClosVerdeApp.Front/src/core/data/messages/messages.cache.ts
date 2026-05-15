import type { InfiniteData } from "@tanstack/react-query";
import type { Message } from "@apis/rest/api/generated";

/**
 * Typed alias for the paginated message cache.
 * Second type param is `unknown` because TanStack Query infers pageParam as `unknown` in InfiniteData.
 */
export type MessagesPages = InfiniteData<Message[], unknown>;

const byCreatedAtAsc = (a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/**
 * Insert or replace a message anywhere in the paginated cache.
 * Idempotent — matches by `id` only, so a SignalR echo of an optimistic message is a no-op.
 * If the message is new, appends it to the last page and re-sorts chronologically.
 */
function upsertInPages(data: MessagesPages | undefined, message: Message): MessagesPages | undefined {
	if (!data) return data;
	let found = false;
	const pages = data.pages.map((page) => {
		const idx = page.findIndex((m) => m.id === message.id);
		if (idx < 0) return page;
		found = true;
		const next = [...page];
		next[idx] = message;
		return next;
	});
	if (found) return { ...data, pages };
	const lastIndex = pages.length - 1;
	if (lastIndex < 0) return { ...data, pages: [[message]] };
	const lastPage = [...pages[lastIndex], message].sort(byCreatedAtAsc);
	const nextPages = [...pages];
	nextPages[lastIndex] = lastPage;
	return { ...data, pages: nextPages };
}

/**
 * Hard-remove a message from all pages by id.
 * Use for physical deletes. For soft-deletes (`isDeleted: true`), use `upsertInPages` instead
 * so the UI can show a "message supprimé" placeholder.
 */
function removeFromPages(data: MessagesPages | undefined, messageId: string): MessagesPages | undefined {
	if (!data) return data;
	let touched = false;
	const pages = data.pages.map((page) => {
		const next = page.filter((m) => m.id !== messageId);
		if (next.length !== page.length) touched = true;
		return next;
	});
	return touched ? { ...data, pages } : data;
}

/**
 * Append an optimistic placeholder to the last page without sorting.
 * Called in `onMutate` before the server responds.
 * Initialises a single-page structure when no cache exists yet.
 */
function appendOptimistic(data: MessagesPages | undefined, message: Message): MessagesPages {
	if (!data) {
		return { pages: [[message]], pageParams: [undefined] };
	}
	const lastIndex = data.pages.length - 1;
	const lastPage = lastIndex >= 0 ? [...data.pages[lastIndex], message] : [message];
	const pages = lastIndex >= 0 ? [...data.pages] : [lastPage];
	if (lastIndex >= 0) pages[lastIndex] = lastPage;
	return { ...data, pages };
}

/**
 * Swap a temp message (id starts with `"temp-"`) for the confirmed server response.
 * Called in `onSuccess` after a successful post.
 */
function replaceOptimistic(data: MessagesPages | undefined, tempId: string, real: Message): MessagesPages | undefined {
	if (!data) return data;
	const withoutTemp = removeFromPages(data, tempId);
	return upsertInPages(withoutTemp, real);
}

/**
 * Flatten all pages into a single chronologically-sorted array for rendering.
 * Pages are stored newest-first (cursor pagination); this re-sorts the full set oldest → newest.
 */
function flatten(data: MessagesPages | undefined): Message[] {
	if (!data) return [];
	const all: Message[] = [];
	for (const page of data.pages) for (const m of page) all.push(m);
	return all.sort(byCreatedAtAsc);
}

export const messagesCache = {
	upsertInPages,
	removeFromPages,
	appendOptimistic,
	replaceOptimistic,
	flatten,
};
