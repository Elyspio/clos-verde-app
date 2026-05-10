import axios, { AxiosError, AxiosHeaders } from "axios";
import { getAccessToken } from "@/core/auth/token";
import { BackendApi, Configuration } from "@apis/rest/api/generated";

export type ApiError = { status: number; message: string };

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
	unauthorizedHandler = handler;
}

export const baseURL = import.meta.env.VITE_API_BASE_URL || window.closVerdeApp?.config?.endpoints?.core || "http://localhost:4000";

export const axiosInstance = axios.create({ baseURL });

axiosInstance.interceptors.request.use((config) => {
	const token = getAccessToken();
	const headers = AxiosHeaders.from(config.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);
	else headers.delete("Authorization");
	config.headers = headers;
	return config;
});

axiosInstance.interceptors.response.use(
	(response) => response,
	(error: AxiosError<ApiError>) => {
		if (error.response?.status === 401) {
			unauthorizedHandler?.();
		}
		return Promise.reject(error);
	},
);

export const backendApi = new BackendApi(new Configuration({ accessToken: () => getAccessToken() ?? "", basePath: baseURL }), baseURL, axiosInstance);

export function extractApiError(error: unknown, fallback = "Une erreur est survenue."): string {
	if (axios.isAxiosError<ApiError>(error)) {
		return error.response?.data?.message ?? error.message ?? fallback;
	}
	if (error instanceof Error) return error.message;
	return fallback;
}
