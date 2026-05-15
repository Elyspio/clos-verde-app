import { useQuery } from "@tanstack/react-query";
import type { DirectoryUser } from "@apis/rest/api/generated";
import { usersService } from "@/core/services/users.service";
import { usersKeys } from "./users.keys";

const sortByDisplayName = (users: DirectoryUser[]): DirectoryUser[] => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));

/**
 * Full Keycloak realm directory, sorted alphabetically.
 * `staleTime: Infinity` — user profiles don't change during a session; fetched once per tab.
 */
function useList() {
	return useQuery({
		queryKey: usersKeys.list(),
		queryFn: () => usersService.list(),
		select: sortByDisplayName,
		staleTime: Infinity,
		gcTime: 30 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export const useUsersQueries = {
	list: useList,
};
