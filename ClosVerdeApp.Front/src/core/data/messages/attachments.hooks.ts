import { useEffect, useState } from "react";
import { axiosInstance } from "@apis/rest/api/clients/api.client";

type ObjectUrlState = { status: "idle" } | { status: "loading" } | { status: "ready"; url: string } | { status: "error"; message: string };

/**
 * Resolves an attachment download URL into an object URL the browser can render
 * directly (e.g. `<img src>`). Necessary because the download endpoint is
 * `[Authorize]` — a plain `<img>` tag can't carry the JWT, so we fetch through
 * axios (which the interceptor stamps with the bearer) and wrap the blob.
 * URLs are revoked when the consumer unmounts or when the source url changes.
 */
export function useAuthenticatedObjectUrl(downloadUrl: string | null | undefined): ObjectUrlState {
	// Results are keyed by the url they were fetched for: "idle" and "loading" are derived
	// during render, so the effect only sets state from the async fetch callbacks.
	const [result, setResult] = useState<{ downloadUrl: string; state: ObjectUrlState } | null>(null);

	useEffect(() => {
		if (!downloadUrl) return;

		const controller = new AbortController();
		let createdUrl: string | null = null;

		axiosInstance
			.get<Blob>(downloadUrl, { responseType: "blob", signal: controller.signal })
			.then(({ data }) => {
				createdUrl = URL.createObjectURL(data);
				setResult({ downloadUrl, state: { status: "ready", url: createdUrl } });
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				const message = error instanceof Error ? error.message : "Téléchargement impossible.";
				setResult({ downloadUrl, state: { status: "error", message } });
			});

		return () => {
			controller.abort();
			if (createdUrl) URL.revokeObjectURL(createdUrl);
			// Forget the (now revoked) object URL so a later return to this url shows "loading".
			setResult((prev) => (prev?.downloadUrl === downloadUrl ? null : prev));
		};
	}, [downloadUrl]);

	if (!downloadUrl) return { status: "idle" };
	if (result?.downloadUrl !== downloadUrl) return { status: "loading" };
	return result.state;
}

/**
 * Downloads a file with the JWT attached and triggers a browser "Save as" dialog
 * via a one-shot anchor. The blob URL is revoked immediately after the click.
 */
export async function downloadWithAuth(downloadUrl: string, fileName: string): Promise<void> {
	const { data } = await axiosInstance.get<Blob>(downloadUrl, { responseType: "blob" });
	const blobUrl = URL.createObjectURL(data);
	const anchor = document.createElement("a");
	anchor.href = blobUrl;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(blobUrl);
}
