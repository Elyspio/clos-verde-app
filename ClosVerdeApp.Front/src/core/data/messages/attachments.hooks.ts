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
	const [state, setState] = useState<ObjectUrlState>({ status: "idle" });

	useEffect(() => {
		if (!downloadUrl) {
			setState({ status: "idle" });
			return;
		}

		const controller = new AbortController();
		let createdUrl: string | null = null;
		setState({ status: "loading" });

		axiosInstance
			.get<Blob>(downloadUrl, { responseType: "blob", signal: controller.signal })
			.then(({ data }) => {
				createdUrl = URL.createObjectURL(data);
				setState({ status: "ready", url: createdUrl });
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				const message = error instanceof Error ? error.message : "Téléchargement impossible.";
				setState({ status: "error", message });
			});

		return () => {
			controller.abort();
			if (createdUrl) URL.revokeObjectURL(createdUrl);
		};
	}, [downloadUrl]);

	return state;
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
