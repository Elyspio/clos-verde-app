export const reservationsKeys = {
	/** Root — invalidate to wipe the entire reservations cache. */
	all: ["reservations"] as const,

	/** Parent of all month entries. Pass to `getQueriesData` to iterate every cached month at once. */
	months: () => [...reservationsKeys.all, "month"] as const,

	/** Reservations covering a specific calendar month (1-indexed). */
	month: (year: number, month: number) => [...reservationsKeys.months(), { year, month }] as const,

	/**
	 * All-time leaderboard ranking.
	 * Always invalidated (refetch) on mutations — ranking is server-computed and can't be patched locally.
	 */
	leaderboard: () => [...reservationsKeys.all, "leaderboard"] as const,
};

/** Serialises year + month to a sortable string (e.g. `"2026-05"`). Not a query key. */
export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** Parses a `monthKey` string back to `{ year, month }`. Returns `null` if invalid. */
export const parseMonthKey = (key: string): { year: number; month: number } | null => {
	const [year, month] = key.split("-").map(Number);
	return Number.isInteger(year) && Number.isInteger(month) ? { year, month } : null;
};
