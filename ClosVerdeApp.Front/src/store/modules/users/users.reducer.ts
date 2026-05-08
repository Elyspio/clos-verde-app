import { createSlice } from "@reduxjs/toolkit";
import { fetchUsers } from "./users.async.actions";
import type { UsersState } from "./users.types";

const initialState: UsersState = {
	byId: {},
	allIds: [],
	status: "idle",
	error: null,
};

const slice = createSlice({
	name: "users",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchUsers.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchUsers.fulfilled, (state, action) => {
				state.status = "ready";
				state.byId = {};
				state.allIds = [];
				for (const u of action.payload) {
					state.byId[u.id] = u;
					state.allIds.push(u.id);
				}
			})
			.addCase(fetchUsers.rejected, (state, action) => {
				state.status = "error";
				state.error = (action.payload as string) ?? "Annuaire indisponible.";
			});
	},
});

export const usersReducer = slice.reducer;
