import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { usersService } from "@/core/services/users.service";
import type { DirectoryUser } from "@apis/rest/api/generated";

export const fetchUsers = createAsyncThunk<DirectoryUser[]>("users/fetch", async (_, { rejectWithValue }) => {
	try {
		return await usersService.list();
	} catch (e) {
		return rejectWithValue(extractApiError(e, "Annuaire indisponible."));
	}
});
