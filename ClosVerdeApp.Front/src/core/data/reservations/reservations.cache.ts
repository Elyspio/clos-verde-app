import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Reservation } from "@apis/rest/api/generated";
import { reservationsKeys } from "./reservations.keys";

/** True if the reservation overlaps the given month (half-open interval check). */
const overlapsMonth = (reservation: Reservation, year: number, month: number) => {
	const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
	const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);
	const start = new Date(reservation.startDate);
	const end = new Date(reservation.endDate);
	return end > monthStart && start < monthEnd;
};

const sortByStart = (entries: Reservation[]): Reservation[] => [...entries].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

/** Extracts `{ year, month }` from a query key whose last segment is `{ year, month }`. */
function readMonthCoords(key: QueryKey): { year: number; month: number } | null {
	// key shape: [...reservationsKeys.months(), { year, month }]
	const last = key[key.length - 1];
	if (last && typeof last === "object" && "year" in last && "month" in last) {
		const year = (last as { year: unknown }).year;
		const month = (last as { month: unknown }).month;
		if (typeof year === "number" && typeof month === "number") return { year, month };
	}
	return null;
}

/**
 * Patch every cached month so the reservation appears in months it overlaps and is absent elsewhere.
 * Cancelled reservations are removed from all months (delegates to `removeFromMonths`).
 */
function refreshMonths(qc: QueryClient, reservation: Reservation) {
	if (reservation.validation.status === "Cancelled") {
		removeFromMonths(qc, reservation.id);
		return;
	}
	const entries = qc.getQueriesData<Reservation[]>({ queryKey: reservationsKeys.months() });
	for (const [key, data] of entries) {
		if (!data) continue;
		const coords = readMonthCoords(key);
		if (!coords) continue;
		const idx = data.findIndex((item) => item.id === reservation.id);
		const shouldContain = overlapsMonth(reservation, coords.year, coords.month);

		if (shouldContain) {
			let next: Reservation[];
			if (idx >= 0) {
				next = [...data];
				next[idx] = reservation;
			} else {
				next = [...data, reservation];
			}
			qc.setQueryData<Reservation[]>(key, sortByStart(next));
		} else if (idx >= 0) {
			qc.setQueryData<Reservation[]>(
				key,
				data.filter((item) => item.id !== reservation.id),
			);
		}
	}
}

/** Remove a reservation from every cached month by id. Only writes when the id is actually present. */
function removeFromMonths(qc: QueryClient, id: string) {
	const entries = qc.getQueriesData<Reservation[]>({ queryKey: reservationsKeys.months() });
	for (const [key, data] of entries) {
		if (!data) continue;
		const next = data.filter((item) => item.id !== id);
		if (next.length !== data.length) qc.setQueryData<Reservation[]>(key, next);
	}
}

export const reservationsCache = {
	refreshMonths,
	removeFromMonths,
};
