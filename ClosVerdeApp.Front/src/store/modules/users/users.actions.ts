import { createSelector } from "@reduxjs/toolkit";
import type { DirectoryUser } from "@/types/models";
import type { UsersState } from "./users.types";

export { fetchUsers } from "./users.async.actions";

// Memoised: same array reference returned until byId/allIds change. Sorted by displayName for stable rendering.
export const selectUsers = createSelector(
	(state: { users: UsersState }) => state.users.byId,
	(state: { users: UsersState }) => state.users.allIds,
	(byId, allIds): DirectoryUser[] => {
		const list: DirectoryUser[] = [];
		for (const id of allIds) {
			const u = byId[id];
			if (u) list.push(u);
		}
		return list.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
	},
);

export const selectUsersStatus = (state: { users: UsersState }) => state.users.status;
