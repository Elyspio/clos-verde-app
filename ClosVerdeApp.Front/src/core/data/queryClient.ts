import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

// TypeScript only:
declare global {
	interface Window {
		__TANSTACK_QUERY_CLIENT__: QueryClient;
	}
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			gcTime: 5 * 60_000,
			refetchOnWindowFocus: true,
			retry: (failureCount, error) => {
				if (axios.isAxiosError(error) && error.response?.status === 401) return false;
				return failureCount < 2;
			},
		},
		mutations: {
			retry: 0,
		},
	},
});

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
