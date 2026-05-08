import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@/core/api/client";
import { usersApi } from "@/core/api/users.api";
import type { DirectoryUser } from "@/types/models";

export const fetchUsers = createAsyncThunk<DirectoryUser[]>("users/fetch", async (_, { rejectWithValue }) => {
	try {
		return await usersApi.list();
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Annuaire indisponible."));
	}
});
