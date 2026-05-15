export const usersKeys = {
	/** Root — invalidate to wipe the entire users cache. */
	all: ["users"] as const,

	/** Full Keycloak directory, sorted by display name. */
	list: () => [...usersKeys.all, "list"] as const,
};
