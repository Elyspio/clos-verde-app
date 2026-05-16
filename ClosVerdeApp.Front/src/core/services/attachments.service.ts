import { axiosInstance } from "@apis/rest/api/clients/api.client";
import type { Attachment } from "@apis/rest/api/generated";

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export type UploadProgress = {
	/** 0..1 fraction. `undefined` early on when the browser hasn't reported lengths yet. */
	ratio?: number;
	loadedBytes: number;
	totalBytes?: number;
};

export type UploadOptions = {
	signal?: AbortSignal;
	onProgress?: (progress: UploadProgress) => void;
};

/**
 * Streams a single file through the backend's streaming multipart endpoint. The browser
 * chunks the request body so the file is never fully buffered in memory; axios reports
 * progress as bytes leave the network stack. Goes around the generated client because
 * the multipart endpoint isn't covered by the typed wrapper.
 */
async function upload(file: File, options: UploadOptions = {}): Promise<Attachment> {
	const form = new FormData();
	form.append("file", file);
	const { data } = await axiosInstance.post<Attachment>("/api/attachments", form, {
		headers: { "Content-Type": "multipart/form-data" },
		signal: options.signal,
		onUploadProgress: (event) => {
			if (!options.onProgress) return;
			const total = event.total;
			const loaded = event.loaded;
			options.onProgress({
				loadedBytes: loaded,
				totalBytes: total,
				ratio: total ? loaded / total : undefined,
			});
		},
	});
	return data;
}

export const attachmentsService = {
	upload,
};
